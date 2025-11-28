// --- 1. FAKE WEB SERVER (To Satisfy Zeabur) ---
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Service is Online and Active.');
});

app.listen(port, () => {
    console.log(`🌐 Web Server running on port ${port}`);
});

// --- 2. DISCORD BOT CODE ---
require('dotenv').config();
const { 
    Client, GatewayIntentBits, SlashCommandBuilder, 
    EmbedBuilder, AttachmentBuilder, ActionRowBuilder, 
    ButtonBuilder, ButtonStyle 
} = require('discord.js');
const axios = require('axios');

// Zeabur Variables
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const GOOGLE_CX_ID = process.env.GOOGLE_CX_ID;
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const searchCache = new Map();

// Styles List
const ART_STYLES = [
    { name: 'Realistic', value: 'photorealistic, 8k, cinematic lighting' },
    { name: 'Anime', value: 'anime style, studio ghibli, vibrant' },
    { name: '3D Render', value: '3d render, unreal engine 5, clean' },
    { name: 'Cyberpunk', value: 'cyberpunk, neon, futuristic' },
    { name: 'Oil Painting', value: 'oil painting, textured, classic' },
    { name: 'Sketch', value: 'pencil sketch, charcoal, rough' },
    { name: 'Vaporwave', value: 'vaporwave, pink and purple, retro 80s' },
    { name: 'Noir', value: 'film noir, black and white' },
    { name: 'Space', value: 'cosmic, nebula, stars' },
    { name: 'Horror', value: 'horror theme, creepy, dark' }
];

client.once('ready', async () => {
    console.log(`✅ Bot Online: ${client.user.tag}`);
    const commands = [
        new SlashCommandBuilder().setName('imagine').setDescription('Generate Image').addStringOption(o => o.setName('prompt').setDescription('Prompt').setRequired(true)).addStringOption(o => o.setName('style').setDescription('Style').addChoices(...ART_STYLES)),
        new SlashCommandBuilder().setName('search').setDescription('Google Search').addStringOption(o => o.setName('query').setDescription('Query').setRequired(true))
    ];
    await client.application.commands.set(commands);
});

client.on('interactionCreate', async interaction => {
    try {
        if (interaction.isCommand()) {
            if (interaction.commandName === 'imagine') await handleImagine(interaction);
            if (interaction.commandName === 'search') await handleSearch(interaction);
        } else if (interaction.isButton()) await handleButtons(interaction);
    } catch (e) { console.error(e); }
});

// --- FUNCTIONS ---
async function handleImagine(interaction) {
    await interaction.deferReply();
    const prompt = interaction.options.getString('prompt');
    const style = interaction.options.getString('style') || ART_STYLES[0].value;
    await generate(interaction, prompt, style);
}

async function generate(interaction, prompt, style) {
    const seed = Math.floor(Math.random() * 999999);
    try {
        const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt + "," + style)}?width=1280&height=720&seed=${seed}&nologo=true`;
        const res = await axios.get(url, { responseType: 'arraybuffer' });
        const attach = new AttachmentBuilder(Buffer.from(res.data), { name: 'art.png' });
        const embed = new EmbedBuilder().setTitle(`🎨 ${prompt.substring(0,100)}`).setImage('attachment://art.png').setColor(0x00FF00);
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('save').setLabel('Save').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('regen').setLabel('Redo').setStyle(ButtonStyle.Primary)
        );
        await interaction.editReply({ embeds: [embed], files: [attach], components: [row] });
    } catch { await interaction.editReply('Error generating image.'); }
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
        try { await interaction.user.send({ files: [message.embeds[0].image.url] }); interaction.reply({content:'Check DMs', ephemeral:true}); } catch { interaction.reply({content:'Open DMs', ephemeral:true}); }
    } else if (customId === 'regen') {
        await interaction.deferUpdate();
        await generate(interaction, message.embeds[0].title.replace('🎨 ', ''), ART_STYLES[0].value);
    } else if (['prev', 'next'].includes(customId)) {
        const d = searchCache.get(message.id);
        if(!d) return interaction.reply({content:'Expired', ephemeral:true});
        await interaction.deferUpdate();
        if(customId === 'next') { d.idx++; if(d.idx >= d.items.length) { d.start+=10; const n=await googleSearch(d.q, d.start); if(n.length) d.items.push(...n); else d.idx--; } }
        else if(d.idx > 0) d.idx--;
        
        const row = ActionRowBuilder.from(message.components[0]);
        row.components[0].setDisabled(d.idx === 0);
        await interaction.editReply({ embeds: [buildSearchEmbed(d.q, d.items[d.idx], d.idx)], components: [row] });
    }
}

async function googleSearch(q, start) {
    try { return (await axios.get(`https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(q)}&cx=${GOOGLE_CX_ID}&key=${GOOGLE_API_KEY}&searchType=image&num=10&start=${start}`)).data.items || []; } catch { return []; }
}
function buildSearchEmbed(q, item, idx) { return new EmbedBuilder().setTitle(`🔎 ${q}`).setDescription(`Result ${idx+1}`).setImage(item.link).setColor(0x0099FF); }

if(DISCORD_TOKEN) client.login(DISCORD_TOKEN);
