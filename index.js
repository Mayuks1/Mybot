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

// --- 1. CHECK VARIABLES ---
console.log("-> Starting Bot...");
if (!process.env.DISCORD_TOKEN) {
    console.error("❌ ERROR: DISCORD_TOKEN is missing in Environment Variables!");
    process.exit(1); // Stop the process so you know it failed here
} else {
    console.log("✅ DISCORD_TOKEN found.");
}

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const GOOGLE_CX_ID = process.env.GOOGLE_CX_ID;

if (!GOOGLE_API_KEY || !GOOGLE_CX_ID) {
    console.warn("⚠️ WARNING: Google Search keys are missing. The /search command will fail if used.");
}

// --- 2. SETUP CLIENT ---
const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

// Cache for search pagination
const searchCache = new Map(); 

// --- STYLE LIST (Strictly 25 items max) ---
const ART_STYLES = [
    { name: 'Realistic (Photo)', value: 'photorealistic, 8k, cinematic lighting, photography' },
    { name: 'Anime (Ghibli)', value: 'anime style, studio ghibli, vibrant colors' },
    { name: 'Cyberpunk', value: 'cyberpunk, neon lights, futuristic, high contrast' },
    { name: '3D Render', value: '3d render, unreal engine 5, octane render, clean' },
    { name: 'Oil Painting', value: 'oil painting, textured, classic art style' },
    { name: 'Watercolor', value: 'watercolor painting, soft edges, artistic, dreamy' },
    { name: 'Vaporwave', value: 'vaporwave aesthetic, pink and purple, retro 80s' },
    { name: 'Noir', value: 'film noir, black and white, dramatic shadows' },
    { name: 'Pixel Art', value: 'pixel art, 16-bit, retro game style' },
    { name: 'Concept Art', value: 'concept art, matte painting, epic scale' },
    { name: 'Sketch', value: 'pencil sketch, graphite, charcoal, rough lines' },
    { name: 'Gothic', value: 'gothic style, dark, mysterious, cathedral atmosphere' },
    { name: 'Steampunk', value: 'steampunk, gears, brass, copper' },
    { name: 'Polaroid', value: 'polaroid photo, vintage camera, film grain' },
    { name: 'Low Poly', value: 'low poly, geometric shapes, minimal' },
    { name: 'Origami', value: 'origami style, paper craft, folded paper' },
    { name: 'Claymation', value: 'claymation, stop motion, plasticine' },
    { name: 'Ukiyo-e', value: 'ukiyo-e, japanese woodblock print, flat colors' },
    { name: 'Surrealism', value: 'surrealism, dreamlike, impossible shapes' },
    { name: 'Pop Art', value: 'pop art, halftone dots, bright colors' },
    { name: 'Stained Glass', value: 'stained glass, vibrant, intricate' },
    { name: 'Marble Statue', value: 'marble statue, roman sculpture, museum lighting' },
    { name: 'Horror', value: 'horror theme, creepy, dark atmosphere' },
    { name: 'Space', value: 'cosmic, nebula, outer space, galaxy' },
    { name: 'Lego', value: 'lego bricks, plastic, toy photography' }
];

client.once('ready', async () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
    console.log("-> Registering Slash Commands...");

    const commands = [
        new SlashCommandBuilder()
            .setName('imagine')
            .setDescription('Generate AI art with professional styles')
            .addStringOption(option => 
                option.setName('prompt')
                .setDescription('Describe the image')
                .setRequired(true))
            .addStringOption(option =>
                option.setName('style')
                .setDescription('Choose a style')
                .addChoices(...ART_STYLES)), // Using the array directly

        new SlashCommandBuilder()
            .setName('search')
            .setDescription('Search Google Images')
            .addStringOption(option => 
                option.setName('query')
                .setDescription('Search term')
                .setRequired(true))
    ];

    try {
        await client.application.commands.set(commands);
        console.log("✅ Slash Commands Registered Successfully!");
    } catch (error) {
        console.error("❌ FAILED to register commands:", error);
    }
});

// --- INTERACTION HANDLER ---
client.on('interactionCreate', async interaction => {
    try {
        if (interaction.isCommand()) {
            if (interaction.commandName === 'imagine') await handleImagine(interaction);
            if (interaction.commandName === 'search') await handleSearch(interaction);
        } 
        else if (interaction.isButton()) {
            await handleButtons(interaction);
        }
    } catch (error) {
        console.error("Global Interaction Error:", error);
        // Don't crash, just log it
    }
});

// --- IMAGINE LOGIC ---
async function handleImagine(interaction) {
    await interaction.deferReply();
    const prompt = interaction.options.getString('prompt');
    const styleValue = interaction.options.getString('style') || ART_STYLES[0].value;
    await generateAndSendImage(interaction, prompt, styleValue, true);
}

async function generateAndSendImage(interaction, prompt, styleTags, isNew) {
    // Basic Prompt Cleaning to prevent URL errors
    const safePrompt = (prompt + ", " + styleTags).replace(/[^a-zA-Z0-9 ,.-]/g, '');
    const seed = Math.floor(Math.random() * 999999);
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(safePrompt)}?width=1280&height=720&seed=${seed}&nologo=true`;

    try {
        const response = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 15000 });
        const buffer = Buffer.from(response.data, 'binary');
        const attachment = new AttachmentBuilder(buffer, { name: 'art.png' });

        const embed = new EmbedBuilder()
            .setTitle(`🎨 ${prompt.substring(0, 200)}`) // Prevent title too long error
            .setDescription(`**Style:** ${styleTags.split(',')[0]}`)
            .setImage('attachment://art.png')
            .setColor(0xE040FB)
            .setFooter({ text: `Seed: ${seed}` });

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder().setCustomId('btn_save').setLabel('💾 Save to DM').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('btn_regen').setLabel('🔄 Create Another').setStyle(ButtonStyle.Primary)
            );

        await interaction.editReply({ embeds: [embed], files: [attachment], components: [row] });
    } catch (err) {
        console.error("Gen Error:", err.message);
        await interaction.editReply('❌ Failed to generate image. API may be busy.');
    }
}

// --- SEARCH LOGIC ---
async function handleSearch(interaction) {
    await interaction.deferReply();
    const query = interaction.options.getString('query');

    if (!GOOGLE_API_KEY || !GOOGLE_CX_ID) {
        return interaction.editReply('❌ Bot is missing Google API Keys.');
    }

    const results = await googleImageSearch(query, 1);
    if (!results.length) return interaction.editReply('❌ No results found.');

    const embed = buildSearchEmbed(query, results[0], 0, results.length);
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder().setCustomId('search_prev').setLabel('⬅️').setStyle(ButtonStyle.Secondary).setDisabled(true),
            new ButtonBuilder().setCustomId('search_save').setLabel('💾 Save').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('search_next').setLabel('➡️').setStyle(ButtonStyle.Secondary)
        );

    const msg = await interaction.editReply({ embeds: [embed], components: [row] });
    searchCache.set(msg.id, { query, results, index: 0, pageStart: 1 });
}

// --- BUTTONS ---
async function handleButtons(interaction) {
    const { customId, message } = interaction;

    if (customId === 'btn_save' || customId === 'search_save') {
        // DM Logic
        try {
            const img = message.embeds[0]?.image?.url;
            if (img) {
                await interaction.user.send({ content: 'Here is your saved image:', files: [img] });
                await interaction.reply({ content: '✅ Check your DMs!', ephemeral: true });
            } else {
                await interaction.reply({ content: '❌ No image found.', ephemeral: true });
            }
        } catch (e) {
            await interaction.reply({ content: '❌ Open your DMs so I can send it.', ephemeral: true });
        }
    } 
    else if (customId === 'btn_regen') {
        // Regen Logic
        await interaction.deferUpdate(); // Acknowledge click
        const oldEmbed = message.embeds[0];
        const prompt = oldEmbed.title.replace('🎨 ', '');
        let style = ART_STYLES[0].value;
        
        // Try to recover style from description
        if (oldEmbed.description) {
            const styleLabel = oldEmbed.description.split('**Style:**')[1]?.trim();
            const found = ART_STYLES.find(s => s.value.startsWith(styleLabel) || s.name === styleLabel);
            if (found) style = found.value;
        }
        
        await generateAndSendImage(interaction, prompt, style, false);
    }
    else if (customId.startsWith('search_')) {
        // Search Nav Logic
        const data = searchCache.get(message.id);
        if (!data) return interaction.reply({ content: '❌ Session expired.', ephemeral: true });

        await interaction.deferUpdate();

        if (customId === 'search_next') {
            data.index++;
            if (data.index >= data.results.length) {
                data.pageStart += 10;
                const more = await googleImageSearch(data.query, data.pageStart);
                if (more.length) data.results.push(...more);
                else data.index--;
            }
        } else if (customId === 'search_prev') {
            if (data.index > 0) data.index--;
        }

        const embed = buildSearchEmbed(data.query, data.results[data.index], data.index, data.results.length);
        const row = ActionRowBuilder.from(message.components[0]);
        
        // Update button states
        row.components[0].setDisabled(data.index === 0);
        
        await interaction.editReply({ embeds: [embed], components: [row] });
    }
}

// Helpers
async function googleImageSearch(query, start) {
    try {
        const url = `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(query)}&cx=${GOOGLE_CX_ID}&key=${GOOGLE_API_KEY}&searchType=image&num=10&start=${start}`;
        const res = await axios.get(url);
        return res.data.items || [];
    } catch (e) {
        console.error("Google API Error:", e.message);
        return [];
    }
}

function buildSearchEmbed(query, result, index, total) {
    return new EmbedBuilder()
        .setTitle(`🔍 ${query}`)
        .setDescription(`Image ${index + 1}`)
        .setImage(result.link)
        .setColor(0x0099FF)
        .setFooter({ text: 'Powered by Google' });
}

// --- START ---
client.login(process.env.DISCORD_TOKEN).catch(e => {
    console.error("❌ LOGIN FAILED:", e.message);
});
