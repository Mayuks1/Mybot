require('dotenv').config();
const { Client, GatewayIntentBits, SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const axios = require('axios');

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

// Load Keys
const GOOGLE_KEY = process.env.GOOGLE_API_KEY;
const GOOGLE_CX = process.env.GOOGLE_CX_ID;

client.once('ready', async () => {
    console.log(`📸 ImageMan is online as ${client.user.tag}`);

    const commands = [
        new SlashCommandBuilder()
            .setName('img')
            .setDescription('Search for an image on Google')
            .addStringOption(option => 
                option.setName('query')
                .setDescription('What do you want to see? (e.g., Porsche 911, Anime)')
                .setRequired(true))
    ];

    await client.application.commands.set(commands);
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    if (interaction.commandName === 'img') {
        await interaction.deferReply(); // Wait for Google
        const query = interaction.options.getString('query');

        try {
            // 1. Request data from Google
            const url = `https://www.googleapis.com/customsearch/v1?q=${query}&cx=${GOOGLE_CX}&key=${GOOGLE_KEY}&searchType=image&num=10&safe=active`;
            const response = await axios.get(url);
            
            // Check if results exist
            if (!response.data.items || response.data.items.length === 0) {
                return interaction.editReply('❌ No images found for that search.');
            }

            const images = response.data.items;
            let currentIndex = 0;

            // 2. Create the Display Function
            const generateEmbed = (index) => {
                const imgData = images[index];
                return new EmbedBuilder()
                    .setTitle(`🔎 Result for: ${query}`)
                    .setDescription(`Image ${index + 1} of ${images.length}`)
                    .setImage(imgData.link) // The main image
                    .setColor(0x0099FF)
                    .setFooter({ text: `Source: ${imgData.displayLink}` });
            };

            // 3. Create Buttons (Back / Next)
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('prev')
                    .setLabel('⬅️ Previous')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('next')
                    .setLabel('Next ➡️')
                    .setStyle(ButtonStyle.Primary)
            );

            // 4. Send the first image
            const message = await interaction.editReply({ 
                embeds: [generateEmbed(currentIndex)], 
                components: [row] 
            });

            // 5. Handle Button Clicks (Collector)
            // Only the person who searched can click the buttons.
            const collector = message.createMessageComponentCollector({ 
                componentType: ComponentType.Button, 
                time: 60000 // Buttons work for 60 seconds
            });

            collector.on('collect', async i => {
                if (i.user.id !== interaction.user.id) {
                    return i.reply({ content: "These buttons aren't for you!", ephemeral: true });
                }

                if (i.customId === 'prev') {
                    currentIndex = currentIndex > 0 ? currentIndex - 1 : images.length - 1;
                } else if (i.customId === 'next') {
                    currentIndex = currentIndex < images.length - 1 ? currentIndex + 1 : 0;
                }

                await i.update({ embeds: [generateEmbed(currentIndex)], components: [row] });
            });

            collector.on('end', () => {
                // Disable buttons after 60 seconds
                const disabledRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('prev').setLabel('⬅️').setStyle(ButtonStyle.Secondary).setDisabled(true),
                    new ButtonBuilder().setCustomId('next').setLabel('➡️').setStyle(ButtonStyle.Primary).setDisabled(true)
                );
                interaction.editReply({ components: [disabledRow] });
            });

        } catch (error) {
            console.error(error);
            await interaction.editReply('⚠️ Google API Error (Daily limit might be reached).');
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
