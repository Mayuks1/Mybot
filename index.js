// --- KEEP ALIVE SERVER (FIX FOR ZEABUR) ---
const http = require('http');
const port = process.env.PORT || 3000;
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('System is online.');
});
server.listen(port, () => {
    console.log(`🌐 Server is listening on port ${port}`);
});

// --- BOT CODE STARTS HERE ---
require('dotenv').config();
const { 
    Client, 
    GatewayIntentBits, 
    SlashCommandBuilder, 
    EmbedBuilder, 
    AttachmentBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle
} = require('discord.js');
const axios = require('axios');

// --- CHECK VARIABLES ---
if (!process.env.DISCORD_TOKEN) {
    console.error("❌ ERROR: DISCORD_TOKEN is missing.");
    // We do not exit process here to keep the HTTP server alive for debugging
}

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const GOOGLE_CX_ID = process.env.GOOGLE_CX_ID;
const ART_STYLES = [
    { name: 'Realistic', value: 'photorealistic, 8k, cinematic lighting' },
    { name: 'Anime', value: 'anime style, studio ghibli, vibrant' },
    { name: '3D Render', value: '3d render, unreal engine 5, clean' },
    { name: 'Digital Art', value: 'digital art, trending on artstation' },
    { name: 'Oil Painting', value: 'oil painting, textured, classic' },
    { name: 'Cyberpunk', value: 'cyberpunk, neon, futuristic' },
    { name: 'Pixel Art', value: 'pixel art, 16-bit, retro' },
    { name: 'Sketch', value: 'pencil sketch, charcoal, rough' },
    { name: 'Watercolor', value: 'watercolor, soft, artistic' },
    { name: 'Vaporwave', value: 'vaporwave, pink and purple, retro 80s' },
    { name: 'Noir', value: 'film noir, black and white' },
    { name: 'Concept Art', value: 'concept art, epic scale, fantasy' },
    { name: 'Gothic', value: 'gothic, dark, mysterious' },
    { name: 'Pop Art', value: 'pop art, halftone dots, bright' },
    { name: 'Space', value: 'cosmic, nebula, stars' },
    { name: 'Low Poly', value: 'low poly, geometric, minimal' },
    { name: 'Steampunk', value: 'steampunk, gears, brass' },
    { name: 'Horror', value: 'horror theme, creepy, dark' },
    { name: 'Marble', value: 'marble statue, classical sculpture' },
    { name: 'Origami', value: 'origami, folded paper, craft' },
    { name: 'Clay', value: 'claymation, stop motion, plasticine' },
    { name: 'Ukiyo-e', value: 'ukiyo-e, japanese woodblock print' },
    { name: 'Glitch', value: 'glitch art, distorted, digital noise' },
    { name: 'Pastel', value: 'pastel colors, soft, cute' },
    { name: 'Graffiti', value: 'graffiti, street art, urban' }
];

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const searchCache = new Map();

client.once('ready', async () => {
    console.log(`✅ Bot logged in as ${client.user.tag}`);
    const commands = [
        new SlashCommandBuilder().setName('imagine').setDescription('Create Art').addStringOption(o => o.setName('prompt').setDescription('What to create?').setRequired(true)).addStringOption(o => o.setName('style').setDescription('Style').addChoices(...ART_STYLES)),
        new SlashCommandBuilder().setName('search').setDescription('Google Search').addStringOption(o => o.setName('query').setDescription('Search query').setRequired(true))
    ];
    await client.application.commands.set(commands);
});

client.on('interactionCreate', async interaction => {
    try {
        if (interaction.isCommand()) {
            if (interaction.commandName === 'imagine') await handleImagine(interaction);
            if (interaction.commandName === 'search') await handleSearch(interaction);
        } else if (interaction.isButton()) {
            await handleButtons(interaction);
        }
    } catch (e) { console.error(e); }
});

async function handleImagine(interaction) {
    await interaction.deferReply();
    const prompt = interaction.options.getString('prompt');
    const style = interaction.options.getString('style') || ART_STYLES[0].value;
    await generate(interaction, prompt, style);
}

async function generate(interaction, prompt, style) {
    const full = `${prompt}, ${style}`;
    const seed = Math.floor(Math.random() * 999999);
    try {
        const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(full)}?width=1280&height=720&seed=${seed}&nologo=true`;
        const res = await axios.get(url, { responseType: 'arraybuffer' });
        const attach = new AttachmentBuilder(Buffer.from(res.data, 'binary'), { name: 'img.png' });
        const embed = new EmbedBuilder().setTitle(`🎨 ${prompt.substring(0,200)}`).setImage('attachment://img.png').setColor(0x00FF00);
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('save').setLabel('Save').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('regen').setLabel('Redo').setStyle(ButtonStyle.Primary)
        );
        await interaction.editReply({ embeds: [embed], files: [attach], components: [row] });
    } catch (e) { await interaction.editReply('Error generating image.'); }
}

async function handleSearch(interaction) {
    await interaction.deferReply();
    const q = interaction.options.getString('query');
    if(!GOOGLE_API_KEY) return interaction.editReply('API Keys missing.');
    const items = await googleSearch(q, 1);
    if(!items.length) return interaction.editReply('No results.');
    
    const embed = buildSearchEmbed(q, items[0], 0);
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('prev').setLabel('⬅️').setStyle(ButtonStyle.Secondary).setDisabled(true),
        new ButtonBuilder().setCustomId('save').setLabel('Save').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('next').setLabel('➡️').setStyle(ButtonStyle.Secondary)
    );
    const msg = await interaction.editReply({ embeds: [embed], components: [row] });
    searchCache.set(msg.id, { q, items, idx: 0, start: 1 });
}

async function handleButtons(interaction) {
    const { customId, message } = interaction;
    if (customId === 'save') {
        try {
            await interaction.user.send({ files: [message.embeds[0].image.url] });
            await interaction.reply({ content: 'Sent to DM!', ephemeral: true });
        } catch { await interaction.reply({ content: 'Open DMs please.', ephemeral: true }); }
    } else if (customId === 'regen') {
        await interaction.deferUpdate();
        const oldTitle = message.embeds[0].title.replace('🎨 ', '');
        await generate(interaction, oldTitle, ART_STYLES[0].value);
    } else if (['prev', 'next'].includes(customId)) {
        const d = searchCache.get(message.id);
        if(!d) return interaction.reply({content:'Expired', ephemeral:true});
        await interaction.deferUpdate();
        
        if (customId === 'next') {
            d.idx++;
            if (d.idx >= d.items.length) {
                d.start += 10;
                const newItems = await googleSearch(d.q, d.start);
                if (newItems.length) d.items.push(...newItems);
                else d.idx--;
            }
        } else if (d.idx > 0) d.idx--;
        
        const row = ActionRowBuilder.from(message.components[0]);
        row.components[0].setDisabled(d.idx === 0);
        await interaction.editReply({ embeds: [buildSearchEmbed(d.q, d.items[d.idx], d.idx)], components: [row] });
    }
}

async function googleSearch(q, start) {
    try {
        const res = await axios.get(`https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(q)}&cx=${GOOGLE_CX_ID}&key=${GOOGLE_API_KEY}&searchType=image&num=10&start=${start}`);
        return res.data.items || [];
    } catch { return []; }
}

function buildSearchEmbed(q, item, idx) {
    return new EmbedBuilder().setTitle(`🔎 ${q}`).setDescription(`Result ${idx+1}`).setImage(item.link).setColor(0x0099FF);
}

if(process.env.DISCORD_TOKEN) client.login(process.env.DISCORD_TOKEN);
