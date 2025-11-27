require('dotenv').config();
const { Client, GatewayIntentBits, SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');

// Initialize Discord Client
const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

// Get Keys from Environment Variables (Secure Method)
const NUMVERIFY_KEY = process.env.NUMVERIFY_KEY;
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;

client.once('ready', async () => {
    console.log(`✅ Bot is online as ${client.user.tag}`);

    // Define the Commands
    const commands = [
        new SlashCommandBuilder()
            .setName('phone')
            .setDescription('Check phone number carrier and location')
            .addStringOption(option => 
                option.setName('number')
                .setDescription('Enter number with country code (e.g. +14155552671)')
                .setRequired(true)),
        
        new SlashCommandBuilder()
            .setName('ip')
            .setDescription('Check IP address location and ISP')
            .addStringOption(option => 
                option.setName('address')
                .setDescription('Enter IP address (e.g. 1.1.1.1)')
                .setRequired(true))
    ];

    // Register commands globally
    await client.application.commands.set(commands);
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;

    // --- COMMAND: PHONE LOOKUP ---
    if (commandName === 'phone') {
        await interaction.deferReply(); // Bot is "thinking"
        const phoneNumber = interaction.options.getString('number');

        try {
            // NumVerify API Request
            // Note: Free plan requires HTTP, not HTTPS
            const url = `http://apilayer.net/api/validate?access_key=${NUMVERIFY_KEY}&number=${phoneNumber}`;
            const response = await axios.get(url);
            const data = response.data;

            // Check if API failed or number is invalid
            if (data.valid === false) {
                return interaction.editReply('❌ Invalid number or API limit reached.');
            }
            if (data.error) {
                return interaction.editReply(`❌ API Error: ${data.error.info}`);
            }

            // Create the Embed
            const phoneEmbed = new EmbedBuilder()
                .setTitle(`📱 Phone Intelligence`)
                .setDescription(`Data for: **${data.number}**`)
                .setColor(0x00FF00)
                .addFields(
                    { name: 'Valid Number', value: data.valid ? 'Yes' : 'No', inline: true },
                    { name: 'Country', value: `${data.country_name} (${data.country_code})`, inline: true },
                    { name: 'Location', value: data.location || 'Unknown', inline: true },
                    { name: 'Carrier', value: data.carrier || 'Unknown', inline: true },
                    { name: 'Line Type', value: data.line_type || 'Unknown', inline: true }
                )
                .setFooter({ text: 'Powered by NumVerify' });

            await interaction.editReply({ embeds: [phoneEmbed] });

        } catch (error) {
            console.error('Phone Cmd Error:', error);
            await interaction.editReply('⚠️ An error occurred while fetching data.');
        }
    }

    // --- COMMAND: IP LOOKUP ---
    if (commandName === 'ip') {
        await interaction.deferReply();
        const ipAddress = interaction.options.getString('address');

        try {
            // IP-API Request (Free, no key needed)
            const url = `http://ip-api.com/json/${ipAddress}`;
            const response = await axios.get(url);
            const data = response.data;

            if (data.status === 'fail') {
                return interaction.editReply('❌ Invalid IP Address.');
            }

            const ipEmbed = new EmbedBuilder()
                .setTitle(`🌐 IP Intelligence`)
                .setDescription(`Data for: **${data.query}**`)
                .setColor(0x0099FF)
                .addFields(
                    { name: 'ISP', value: data.isp || 'Unknown', inline: false },
                    { name: 'Country', value: data.country || 'Unknown', inline: true },
                    { name: 'City', value: data.city || 'Unknown', inline: true },
                    { name: 'Timezone', value: data.timezone || 'Unknown', inline: true },
                    { name: 'Coordinates', value: `${data.lat}, ${data.lon}`, inline: true }
                )
                .setFooter({ text: 'Powered by IP-API' });

            await interaction.editReply({ embeds: [ipEmbed] });

        } catch (error) {
            console.error('IP Cmd Error:', error);
            await interaction.editReply('⚠️ An error occurred while fetching IP data.');
        }
    }
});

// Login
client.login(DISCORD_TOKEN);
