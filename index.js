import { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    REST, 
    Routes, 
    SlashCommandBuilder 
} from "discord.js";
import "dotenv/config";
import fs from "fs";
import path from "path";
import fetch from 'node-fetch';

// --- CONFIGURATION ---
const ADMIN_ID = "934670194096345118"; 
const filePath = path.join(process.cwd(), "images.json");
const PREFIX = "$"; 

// Valid Categories
const VALID_CATEGORIES = [
  'girl', 'boy', 'hentai', 'real', 'gif', '4k', 
  'ass', 'tits', 'nude', 'girls', 'anal', 
  'lesbian', 'cum', 'squirt', 'asian', 'normalpics'
];

// --- COMMAND DEFINITIONS (For Slash Commands) ---
const commands = [
    new SlashCommandBuilder()
        .setName('naughty')
        .setDescription('Get content from a specific category')
        .addSubcommand(sub => sub.setName('girl').setDescription('Get random girl content'))
        .addSubcommand(sub => sub.setName('boy').setDescription('Get random boy content'))
        .addSubcommand(sub => sub.setName('hentai').setDescription('Get random hentai content'))
        .addSubcommand(sub => sub.setName('real').setDescription('Get random realistic content'))
        .addSubcommand(sub => sub.setName('gif').setDescription('Get random GIF content'))
        .addSubcommand(sub => sub.setName('4k').setDescription('Get random 4K content'))
        .addSubcommand(sub => sub.setName('ass').setDescription('Get random ass content'))
        .addSubcommand(sub => sub.setName('tits').setDescription('Get random tits content'))
        .addSubcommand(sub => sub.setName('nude').setDescription('Get random nude content'))
        .addSubcommand(sub => sub.setName('girls').setDescription('Get random girls content'))
        .addSubcommand(sub => sub.setName('anal').setDescription('Get random anal content'))
        .addSubcommand(sub => sub.setName('lesbian').setDescription('Get random lesbian content'))
        .addSubcommand(sub => sub.setName('cum').setDescription('Get random cum content'))
        .addSubcommand(sub => sub.setName('squirt').setDescription('Get random squirt content'))
        .addSubcommand(sub => sub.setName('asian').setDescription('Get random asian content'))
        .addSubcommand(sub => sub.setName('normalpics').setDescription('Get random normal pics')),

    new SlashCommandBuilder()
        .setName('admin')
        .setDescription('Admin commands')
        .addSubcommand(sub => sub.setName('add').setDescription('Add link').addStringOption(o => o.setName('category').setRequired(true).addChoices(...VALID_CATEGORIES.map(c => ({name: c, value: c})))).addStringOption(o => o.setName('url').setRequired(true)))
        .addSubcommand(sub => sub.setName('bulkadd').setDescription('Upload .txt file').addStringOption(o => o.setName('category').setRequired(true).addChoices(...VALID_CATEGORIES.map(c => ({name: c, value: c})))).addAttachmentOption(o => o.setName('file').setRequired(true)))
        .addSubcommand(sub => sub.setName('reset').setDescription('Delete category').addStringOption(o => o.setName('category').setRequired(true).addChoices(...VALID_CATEGORIES.map(c => ({name: c, value: c})))))
].map(c => c.toJSON());

// --- HELPER FUNCTIONS ---
function loadData() {
  try {
    let data = {};
    if (fs.existsSync(filePath)) {
        try { data = JSON.parse(fs.readFileSync(filePath, "utf8")); } catch (e) { data = {}; }
    }
    // Structure repair
    VALID_CATEGORIES.forEach(cat => { if (!Array.isArray(data[cat])) data[cat] = []; });
    return data;
  } catch (error) { return {}; }
}

function saveData(data) {
  try { fs.writeFileSync(filePath, JSON.stringify(data, null, 2)); } catch (e) { console.error(e); }
}

// --- CLIENT SETUP ---
const token = process.env.TOKEN;
const clientId = process.env.CLIENT_ID;

if (!token) { console.error("FATAL: TOKEN missing"); process.exit(1); }

// IMPORTANT: Added GuildMessages and MessageContent for $ commands to work
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent 
    ] 
});

// --- STARTUP & SLASH DEPLOY ---
client.once("ready", async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  
  const rest = new REST({ version: '10' }).setToken(token);
  const effectiveClientId = clientId || client.user.id;

  try {
    console.log('⏳ Registering Slash Commands...');
    await rest.put(Routes.applicationCommands(effectiveClientId), { body: commands });
    console.log('✅ Slash Commands Registered!');
  } catch (error) {
    console.error('❌ Slash Command Error:', error);
  }
});

// --- SHARED IMAGE SENDER ---
async function sendNaughtyImage(target, category) {
    const data = loadData();
    const images = data[category];

    if (!images || images.length === 0) {
        const msg = `🚫 No images found in **${category}**. Admin needs to add some!`;
        if (target.reply) await target.reply({ content: msg, ephemeral: true });
        else target.channel.send(msg);
        return;
    }

    const randomImageUrl = images[Math.floor(Math.random() * images.length)];

    const embed = new EmbedBuilder()
      .setColor("#FF69B4")
      .setTitle(`Naughty ${category.toUpperCase()}`)
      .setImage(randomImageUrl)
      .setFooter({ text: "NAUGHTY BOT JJM" });

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`next_${category}`) 
          .setLabel('Next ➡️')
          .setStyle(ButtonStyle.Primary),
      );

    if (target.reply) {
        // Slash command or Button
        if (target.isButton && target.isButton()) await target.update({ embeds: [embed] });
        else await target.reply({ embeds: [embed], components: [row] });
    } else {
        // Text message ($)
        await target.channel.send({ embeds: [embed], components: [row] });
    }
}

// --- MESSAGE HANDLER ($ COMMANDS) ---
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase(); // e.g., "naughty"

    if (command === 'naughty') {
        const category = args[0]?.toLowerCase();
        
        if (!category) {
            return message.channel.send(`Please specify a category. Example: \`$naughty girl\`\nValid: ${VALID_CATEGORIES.join(', ')}`);
        }

        if (VALID_CATEGORIES.includes(category)) {
            await sendNaughtyImage(message, category);
        } else {
            return message.channel.send(`❌ Invalid category. Try: ${VALID_CATEGORIES.join(', ')}`);
        }
    }
});

// --- INTERACTION HANDLER (/ COMMANDS & BUTTONS) ---
client.on("interactionCreate", async (interaction) => {
    try {
        // 1. Buttons
        if (interaction.isButton()) {
            const parts = interaction.customId.split('_');
            if (parts[0] === 'next') {
                await sendNaughtyImage(interaction, parts[1]);
            }
            return;
        }

        // 2. Slash Commands
        if (!interaction.isChatInputCommand()) return;

        if (interaction.commandName === 'naughty') {
            const category = interaction.options.getSubcommand();
            await sendNaughtyImage(interaction, category);
        }

        // 3. Admin Commands
        if (interaction.commandName === 'admin') {
            if (interaction.user.id !== ADMIN_ID) return interaction.reply({ content: "🚫 Admin only.", ephemeral: true });

            const sub = interaction.options.getSubcommand();
            const category = interaction.options.getString('category');
            const data = loadData();

            if (sub === 'add') {
                const url = interaction.options.getString('url');
                if (!url.startsWith('http')) return interaction.reply({ content: "Invalid URL", ephemeral: true });
                data[category].push(url);
                saveData(data);
                await interaction.reply({ content: `✅ Added to **${category}**.`, ephemeral: true });
            }
            
            if (sub === 'bulkadd') {
                const file = interaction.options.getAttachment('file');
                if (!file.name.endsWith('.txt')) return interaction.reply({ content: "Need .txt file", ephemeral: true });
                await interaction.deferReply({ ephemeral: true });
                const res = await fetch(file.url);
                const txt = await res.text();
                const lines = txt.split(/\r?\n/).map(l => l.trim()).filter(l => l.startsWith('http'));
                data[category].push(...lines);
                saveData(data);
                await interaction.editReply(`✅ Bulk added **${lines.length}** to **${category}**.`);
            }

            if (sub === 'reset') {
                data[category] = [];
                saveData(data);
                await interaction.reply({ content: `🗑️ **${category}** cleared.`, ephemeral: true });
            }
        }

    } catch (e) {
        console.error(e);
        if (!interaction.replied) await interaction.reply({ content: "Error occurred.", ephemeral: true });
    }
});

// --- ANTI CRASH ---
process.on('unhandledRejection', (r) => { console.log('Anti-Crash:', r); });
process.on("uncaughtException", (e) => { console.log('Anti-Crash:', e); });

client.login(token);
