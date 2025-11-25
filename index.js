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

// --- ERROR HANDLING (PREVENT CRASHES) ---
process.on('unhandledRejection', (reason, p) => {
    console.log(' [Anti-Crash] :: Unhandled Rejection/Catch');
    console.log(reason, p);
});
process.on("uncaughtException", (err, origin) => {
    console.log(' [Anti-Crash] :: Uncaught Exception/Catch');
    console.log(err, origin);
});

// --- HELPER FUNCTIONS ---
function loadData() {
  try {
    let data = {};
    if (fs.existsSync(filePath)) {
        try { 
            const content = fs.readFileSync(filePath, "utf8");
            data = JSON.parse(content); 
        } catch (e) { 
            console.log("⚠️ images.json was corrupted. Resetting.");
            data = {}; 
        }
    }
    // Structure repair
    let modified = false;
    VALID_CATEGORIES.forEach(cat => { 
        if (!Array.isArray(data[cat])) {
            data[cat] = []; 
            modified = true;
        }
    });
    if (modified) saveData(data);
    return data;
  } catch (error) { 
      console.log("⚠️ Error loading data. Returning empty object.");
      const empty = {};
      VALID_CATEGORIES.forEach(c => empty[c] = []);
      return empty; 
  }
}

function saveData(data) {
  try { fs.writeFileSync(filePath, JSON.stringify(data, null, 2)); } catch (e) { console.error("Failed to save data:", e); }
}

// --- CLIENT SETUP ---
const token = process.env.TOKEN;
const clientId = process.env.CLIENT_ID;

if (!token) { 
    console.error("FATAL ERROR: TOKEN is missing in .env file."); 
    process.exit(1); 
}

// --- INITIALIZE CLIENT ---
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent // <--- THIS REQUIRES INTENT SWITCH ON IN DEV PORTAL
    ] 
});

// --- COMMAND DEFINITIONS ---
const commands = [
    new SlashCommandBuilder()
        .setName('naughty')
        .setDescription('Get content from a specific category')
        .addSubcommand(sub => sub.setName('girl').setDescription('Girl content'))
        .addSubcommand(sub => sub.setName('boy').setDescription('Boy content'))
        .addSubcommand(sub => sub.setName('hentai').setDescription('Hentai content'))
        .addSubcommand(sub => sub.setName('real').setDescription('Realistic content'))
        .addSubcommand(sub => sub.setName('gif').setDescription('GIF content'))
        .addSubcommand(sub => sub.setName('4k').setDescription('4K content'))
        .addSubcommand(sub => sub.setName('ass').setDescription('Ass content'))
        .addSubcommand(sub => sub.setName('tits').setDescription('Tits content'))
        .addSubcommand(sub => sub.setName('nude').setDescription('Nude content'))
        .addSubcommand(sub => sub.setName('girls').setDescription('Girls content'))
        .addSubcommand(sub => sub.setName('anal').setDescription('Anal content'))
        .addSubcommand(sub => sub.setName('lesbian').setDescription('Lesbian content'))
        .addSubcommand(sub => sub.setName('cum').setDescription('Cum content'))
        .addSubcommand(sub => sub.setName('squirt').setDescription('Squirt content'))
        .addSubcommand(sub => sub.setName('asian').setDescription('Asian content'))
        .addSubcommand(sub => sub.setName('normalpics').setDescription('Normal pics content')),

    new SlashCommandBuilder()
        .setName('admin')
        .setDescription('Admin commands')
        .addSubcommand(sub => sub.setName('add').setDescription('Add link').addStringOption(o => o.setName('category').setRequired(true).addChoices(...VALID_CATEGORIES.map(c => ({name: c, value: c})))).addStringOption(o => o.setName('url').setRequired(true)))
        .addSubcommand(sub => sub.setName('bulkadd').setDescription('Upload .txt file').addStringOption(o => o.setName('category').setRequired(true).addChoices(...VALID_CATEGORIES.map(c => ({name: c, value: c})))).addAttachmentOption(o => o.setName('file').setRequired(true)))
        .addSubcommand(sub => sub.setName('reset').setDescription('Delete category').addStringOption(o => o.setName('category').setRequired(true).addChoices(...VALID_CATEGORIES.map(c => ({name: c, value: c})))))
].map(c => c.toJSON());

// --- STARTUP ---
client.once("ready", async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  
  // Deploy Commands safely
  try {
      const rest = new REST({ version: '10' }).setToken(token);
      const effectiveClientId = clientId || client.user.id;
      console.log('⏳ Registering Slash Commands...');
      await rest.put(Routes.applicationCommands(effectiveClientId), { body: commands });
      console.log('✅ Slash Commands Registered!');
  } catch (error) {
      console.error('❌ Slash Command Error (Bot will still run):', error);
  }
});

// --- SHARED IMAGE SENDER ---
async function sendNaughtyImage(target, category) {
    const data = loadData();
    const images = data[category];

    if (!images || images.length === 0) {
        const msg = `🚫 No images found in **${category}**. Admin needs to add some!`;
        if (target.reply) await target.reply({ content: msg, ephemeral: true }).catch(() => {});
        else target.channel.send(msg).catch(() => {});
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

    try {
        if (target.reply) {
            // Slash or Button
            if (target.isButton && target.isButton()) await target.update({ embeds: [embed] });
            else await target.reply({ embeds: [embed], components: [row] });
        } else {
            // Text ($)
            await target.channel.send({ embeds: [embed], components: [row] });
        }
    } catch (err) {
        console.error("Failed to send message:", err);
    }
}

// --- MESSAGE HANDLER ($ COMMANDS) ---
client.on('messageCreate', async (message) => {
    try {
        if (message.author.bot) return;
        if (!message.content.startsWith(PREFIX)) return;

        const args = message.content.slice(PREFIX.length).trim().split(/ +/);
        const command = args.shift().toLowerCase(); // e.g., "naughty"

        if (command === 'naughty') {
            const category = args[0]?.toLowerCase();
            
            if (!category) {
                return message.channel.send(`Please specify a category. Example: \`$naughty girl\`\nValid: ${VALID_CATEGORIES.join(', ')}`).catch(() => {});
            }

            if (VALID_CATEGORIES.includes(category)) {
                await sendNaughtyImage(message, category);
            } else {
                return message.channel.send(`❌ Invalid category. Try: ${VALID_CATEGORIES.join(', ')}`).catch(() => {});
            }
        }
    } catch (err) {
        console.error("Message Handler Error:", err);
    }
});

// --- INTERACTION HANDLER (/ COMMANDS & BUTTONS) ---
client.on("interactionCreate", async (interaction) => {
    try {
        if (interaction.isButton()) {
            const parts = interaction.customId.split('_');
            if (parts[0] === 'next') {
                await sendNaughtyImage(interaction, parts[1]);
            }
            return;
        }

        if (!interaction.isChatInputCommand()) return;

        if (interaction.commandName === 'naughty') {
            const category = interaction.options.getSubcommand();
            await sendNaughtyImage(interaction, category);
        }

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
        console.error("Interaction Error:", e);
        if (!interaction.replied) await interaction.reply({ content: "An internal error occurred.", ephemeral: true }).catch(() => {});
    }
});

client.login(token);
