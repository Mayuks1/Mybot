require('dotenv').config();
const { Client, GatewayIntentBits, SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const axios = require('axios');

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

client.once('ready', async () => {
    console.log(`🎨 Artist Bot is online as ${client.user.tag}`);

    const commands = [
        new SlashCommandBuilder()
            .setName('imagine')
            .setDescription('Generate an AI image from text (Like Leonardo/Midjourney)')
            .addStringOption(option => 
                option.setName('prompt')
                .setDescription('Describe the image (e.g., A cyberpunk samurai cat)')
                .setRequired(true))
            .addStringOption(option =>
                option.setName('style')
                .setDescription('Choose a style')
                .addChoices(
                    { name: 'Realistic', value: 'realistic' },
                    { name: 'Anime', value: 'anime' },
                    { name: '3D Render', value: '3d' },
                    { name: 'Painting', value: 'painting' }
                ))
    ];

    await client.application.commands.set(commands);
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    if (interaction.commandName === 'imagine') {
        await interaction.deferReply(); // AI takes 5-10 seconds
        
        const prompt = interaction.options.getString('prompt');
        const style = interaction.options.getString('style') || 'realistic';
        
        // Enhance the prompt based on style
        let finalPrompt = prompt;
        if (style === 'anime') finalPrompt += ", anime style, studio ghibli, vibrant";
        if (style === '3d') finalPrompt += ", 3d render, unreal engine 5, 8k";
        if (style === 'realistic') finalPrompt += ", photorealistic, cinematic lighting, 4k";
        
        try {
            // 1. Generate the URL (Pollinations.ai)
            // We use a random seed number so the image is different every time
            const seed = Math.floor(Math.random() * 100000);
            const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(finalPrompt)}?width=1024&height=1024&seed=${seed}&nologo=true`;

            // 2. Download the image as a buffer (File)
            const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
            const buffer = Buffer.from(response.data, 'binary');

            // 3. Create Attachment
            const imageAttachment = new AttachmentBuilder(buffer, { name: 'art.png' });

            // 4. Create Embed
            const embed = new EmbedBuilder()
                .setTitle(`🎨 Generated: ${prompt}`)
                .setDescription(`Style: **${style}**\nRequested by: ${interaction.user}`)
                .setImage('attachment://art.png') // Refers to the file we are uploading
                .setColor(0xE040FB) // Neon Purple
                .setFooter({ text: 'Powered by Pollinations AI' });

            // 5. Send it
            await interaction.editReply({ embeds: [embed], files: [imageAttachment] });

        } catch (error) {
            console.error(error);
            await interaction.editReply('❌ Failed to generate image. The AI might be busy.');
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
