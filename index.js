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

// --- CONFIGURATION ---
// These are pulled automatically from your Zeabur variables
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const GOOGLE_CX_ID = process.env.GOOGLE_CX_ID;
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;

// Memory cache for Search Pagination (Map: MessageID -> SearchData)
const searchCache = new Map(); 

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

// --- PROFESSIONAL STYLE LIST (Max 25 for Discord Slash Commands) ---
const ART_STYLES = [
    { name: '✨ Realistic (Photo)', value: 'photorealistic, 8k, cinematic lighting, highly detailed, photography' },
    { name: '🎎 Anime (Ghibli)', value: 'anime style, studio ghibli, vibrant colors, detailed scenery' },
    { name: '🌆 Cyberpunk', value: 'cyberpunk, neon lights, futuristic, detailed, high contrast' },
    { name: '🧊 3D Render', value: '3d render, unreal engine 5, octane render, ray tracing, clean' },
    { name: '🎨 Oil Painting', value: 'oil painting, textured, classic art style, thick brushstrokes' },
    { name: '🖌️ Watercolor', value: 'watercolor painting, soft edges, artistic, dreamy, wet on wet' },
    { name: '📼 Vaporwave', value: 'vaporwave aesthetic, pink and purple, retro 80s, glitch art, lo-fi' },
    { name: '🕵️ Noir', value: 'film noir, black and white, high contrast, dramatic shadows' },
    { name: '👾 Pixel Art', value: 'pixel art, 16-bit, retro game style, sprite sheet' },
    { name: '🏰 Concept Art', value: 'concept art, matte painting, epic scale, fantasy landscape' },
    { name: '✏️ Sketch', value: 'pencil sketch, graphite, charcoal, rough lines, hand drawn' },
    { name: '🕸️ Gothic', value: 'gothic style, dark, mysterious, intricate details, cathedral atmosphere' },
    { name: '⚙️ Steampunk', value: 'steampunk, gears, brass, copper, victorian industrial' },
    { name: '📸 Polaroid', value: 'polaroid photo, vintage camera, flash photography, film grain' },
    { name: '🔺 Low Poly', value: 'low poly, geometric shapes, minimal, blender style, isometric' },
    { name: '🦋 Origami', value: 'origami style, paper craft, folded paper, textured paper' },
    { name: '🎬 Claymation', value: 'claymation, stop motion, plasticine, aardman style' },
    { name: '🌊 Ukiyo-e', value: 'ukiyo-e, japanese woodblock print, flat colors, traditional' },
    { name: '😵 Surrealism', value: 'surrealism, salvador dali style, dreamlike, impossible shapes' },
    { name: '💥 Pop Art', value: 'pop art, andy warhol style, halftone dots, bright colors' },
    { name: '⛪ Stained Glass', value: 'stained glass, vibrant, intricate, church window style' },
    { name: '🏛️ Marble Statue', value: 'marble statue, roman sculpture, chiseled, museum lighting' },
    { name: '🧟 Horror', value: 'horror theme, creepy, dark atmosphere, unsettling, gritty' },
    { name: '🌌 Space/Nebula', value: 'cosmic, nebula, outer space, stars, galaxy, hubble photography' },
    { name: '🧱 Lego', value: 'lego bricks, plastic, toy photography, macro' }
];

client.once('ready', async () => {
    console.log(`🎨 Artist Bot is online as ${client.user.tag}`);

    const commands = [
        // 1. IMAGINE COMMAND
        new SlashCommandBuilder()
            .setName('imagine')
            .setDescription('Generate AI art with professional styles')
            .addStringOption(option => 
                option.setName('prompt')
                .setDescription('Describe the image you want')
                .setRequired(true))
            .addStringOption(option =>
                option.setName('style')
                .setDescription('Choose a visual style')
                .addChoices(...ART_STYLES.map(s => ({ name: s.name, value: s.value })))),

        // 2. SEARCH COMMAND
        new SlashCommandBuilder()
            .setName('search')
            .setDescription('Search Google Images (Unlimited browsing)')
            .addStringOption(option => 
                option.setName('query')
                .setDescription('What do you want to search for?')
                .setRequired(true))
    ];

    await client.application.commands.set(commands);
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
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: '❌ An error occurred.', ephemeral: true });
        }
    }
});

// ==========================================
// 1. IMAGINE (AI GENERATION) SYSTEM
// ==========================================
async function handleImagine(interaction) {
    await interaction.deferReply();
    
    const prompt = interaction.options.getString('prompt');
    const styleValue = interaction.options.getString('style') || ART_STYLES[0].value;
    
    await generateAndSendImage(interaction, prompt, styleValue, true);
}

// Core Generation Function
async function generateAndSendImage(interaction, prompt, styleTags, isNew) {
    const fullPrompt = `${prompt}, ${styleTags}`;
    // Random seed ensures a new image every time
    const seed = Math.floor(Math.random() * 999999);
    
    // Using Pollinations AI API
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(fullPrompt)}?width=1280&height=720&seed=${seed}&nologo=true`;

    try {
        const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data, 'binary');
        const attachment = new AttachmentBuilder(buffer, { name: 'art.png' });

        const embed = new EmbedBuilder()
            .setTitle(`🎨 ${prompt}`)
            .setDescription(`**Style:** ${styleTags.split(',')[0]}`) 
            .setImage('attachment://art.png')
            .setColor(0xE040FB)
            .setFooter({ text: `Powered by Pollinations AI | Seed: ${seed}` });

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('btn_save')
                    .setLabel('💾 Save to DM')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    // We store the prompt in the ID carefully to regenerate later
                    // Note: Custom IDs have a 100 char limit. We truncate prompt if needed.
                    .setCustomId(`btn_regen`) 
                    .setLabel('🔄 Create Another')
                    .setStyle(ButtonStyle.Primary)
            );

        // Store original prompt in the embed footer or description logic for regeneration
        // But for simplicity in this "regen" logic, we will assume the style stays the same
        
        const payload = { embeds: [embed], files: [attachment], components: [row] };

        if (isNew) await interaction.editReply(payload);
        else await interaction.editReply(payload);

    } catch (err) {
        console.error("Generation Error:", err);
        await interaction.editReply('❌ Failed to generate image. The AI provider might be busy.');
    }
}

// ==========================================
// 2. SEARCH (GOOGLE IMAGES) SYSTEM
// ==========================================
async function handleSearch(interaction) {
    await interaction.deferReply();
    const query = interaction.options.getString('query');

    // Check Keys
    if (!GOOGLE_API_KEY || !GOOGLE_CX_ID) {
        return interaction.editReply('❌ **Configuration Error**: Google API keys are missing in Zeabur variables.');
    }

    const results = await googleImageSearch(query, 1);

    if (!results || results.length === 0) {
        return interaction.editReply('❌ No results found. Try a different query.');
    }

    // Prepare first result
    const currentIndex = 0;
    const embed = buildSearchEmbed(query, results[currentIndex], currentIndex, results.length);
    
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder().setCustomId('search_prev').setLabel('⬅️ Previous').setStyle(ButtonStyle.Secondary).setDisabled(true),
            new ButtonBuilder().setCustomId('search_save').setLabel('💾 Save').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('search_next').setLabel('Next ➡️').setStyle(ButtonStyle.Secondary)
        );

    const msg = await interaction.editReply({ embeds: [embed], components: [row] });

    // Store session data
    searchCache.set(msg.id, {
        query: query,
        results: results,
        index: currentIndex,
        pageStart: 1 // Google API offset
    });

    // Cleanup cache after 15 mins
    setTimeout(() => searchCache.delete(msg.id), 15 * 60 * 1000);
}

// Google API Helper
async function googleImageSearch(query, start = 1) {
    const url = `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(query)}&cx=${GOOGLE_CX_ID}&key=${GOOGLE_API_KEY}&searchType=image&num=10&start=${start}`;
    try {
        const res = await axios.get(url);
        if (res.data.items) {
            return res.data.items.map(item => ({
                title: item.title,
                link: item.link,
                contextLink: item.image.contextLink
            }));
        }
        return [];
    } catch (e) {
        console.error("Google Search Error:", e.response?.data || e.message);
        return [];
    }
}

// Embed Builder Helper
function buildSearchEmbed(query, result, index, total) {
    return new EmbedBuilder()
        .setTitle(`🔍 Search: ${query}`)
        .setDescription(`Result **${index + 1}**\n[Original Source](${result.contextLink})`)
        .setImage(result.link)
        .setColor(0x00A8FC)
        .setFooter({ text: 'Powered by Google Custom Search' });
}

// ==========================================
// 3. BUTTON HANDLER
// ==========================================
async function handleButtons(interaction) {
    const { customId, message } = interaction;

    // --- SAVE LOGIC ---
    if (customId === 'btn_save' || customId === 'search_save') {
        const embed = message.embeds[0];
        if (!embed || !embed.image) return interaction.reply({ content: '❌ No image to save.', ephemeral: true });

        try {
            await interaction.user.send({ 
                content: `Here is your saved image from the **${interaction.guild.name}** server:`, 
                files: [embed.image.url] 
            });
            await interaction.reply({ content: '✅ Sent to your DMs!', ephemeral: true });
        } catch (e) {
            await interaction.reply({ content: '❌ I cannot DM you. Check your privacy settings.', ephemeral: true });
        }
        return;
    }

    // --- REGENERATE LOGIC ---
    if (customId === 'btn_regen') {
        await interaction.deferUpdate();
        const oldEmbed = message.embeds[0];
        // Parse Title: "🎨 A cyberpunk cat" -> "A cyberpunk cat"
        const prompt = oldEmbed.title.replace('🎨 ', '');
        
        // Parse Style from Description: "**Style:** realistic" -> "realistic"
        let style = ART_STYLES[0].value;
        if (oldEmbed.description && oldEmbed.description.includes('**Style:**')) {
            const styleName = oldEmbed.description.split('**Style:**')[1].trim();
            // Find the full value string based on the short name if possible, or just use it
             const foundStyle = ART_STYLES.find(s => s.value.startsWith(styleName) || s.name.includes(styleName));
             if (foundStyle) style = foundStyle.value;
        }

        await generateAndSendImage(interaction, prompt, style, false);
        return;
    }

    // --- SEARCH PAGINATION LOGIC ---
    if (['search_prev', 'search_next'].includes(customId)) {
        const data = searchCache.get(message.id);
        if (!data) return interaction.reply({ content: '❌ Search session expired.', ephemeral: true });

        await interaction.deferUpdate();

        if (customId === 'search_next') {
            data.index++;
            // If we reached the end of cached results, fetch more
            if (data.index >= data.results.length) {
                data.pageStart += 10;
                const moreResults = await googleImageSearch(data.query, data.pageStart);
                if (moreResults.length > 0) {
                    data.results = data.results.concat(moreResults);
                } else {
                    data.index--; // Undo move if no more results
                }
            }
        } else {
            if (data.index > 0) data.index--;
        }

        const embed = buildSearchEmbed(data.query, data.results[data.index], data.index, data.results.length);
        
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder().setCustomId('search_prev').setLabel('⬅️ Previous').setStyle(ButtonStyle.Secondary).setDisabled(data.index === 0),
                new ButtonBuilder().setCustomId('search_save').setLabel('💾 Save').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('search_next').setLabel('Next ➡️').setStyle(ButtonStyle.Secondary)
            );

        await interaction.editReply({ embeds: [embed], components: [row] });
        searchCache.set(message.id, data);
    }
}

client.login(DISCORD_TOKEN);
