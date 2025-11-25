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

// --- DEBUG START ---
console.log("🚀 Starting Bot...");

// --- CONFIGURATION ---
const ADMIN_ID = "934670194096345118"; 
const PREFIX = "$"; 
const filePath = path.join(process.cwd(), "images.json");

const VALID_CATEGORIES = [
  'girl', 'boy', 'hentai', 'real', 'gif', '4k', 
  'ass', 'tits', 'nude', 'girls', 'anal', 
  'lesbian', 'cum', 'squirt', 'asian', 'normalpics'
];

// --- ANTI-CRASH ---
process.on('unhandledRejection', (reason, p) => {
    console.log('❌ [Anti-Crash] Unhandled Rejection:', reason);
});
process.on("uncaughtException", (err, origin) => {
    console.log('❌ [Anti-Crash] Uncaught Exception:', err);
});

// --- HELPER FUNCTIONS ---
function loadData() {
    try {
        let data = {};
        if (fs.existsSync(filePath)) {
            try { data = JSON.parse(fs.readFileSync(filePath, "utf8")); } 
            catch (e) { console.log("⚠️ Database corrupted, resetting."); data = {}; }
        }
        
        let saved = false;
        VALID_CATEGORIES.forEach(cat => {
            if (!Array.isArray(data[cat])) {
                data[cat] = [];
                saved = true;
            }
        });
        if (saved) saveData(data);
        return data;
    } catch (e) {
        return {};
    }
}

function saveData(data) {
    try { fs.writeFileSync(filePath, JSON.stringify(data, null, 2)); } 
    catch (e) { console.error("Save Error:", e); }
}

// --- CHECK TOKEN ---
if (!process.env.TOKEN) {
    console.error("⛔ FATAL ERROR: TOKEN is missing in your .env file!");
    process.exit(1);
}

// --- CLIENT SETUP ---
console.log("⚙️ Initializing Client...");
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        // IF BOT CRASHES WITH "DISALLOWED INTENTS", TURN THIS LINE OFF:
        GatewayIntentBits.MessageContent 
    ] 
});

// --- COMMAND DEFINITIONS ---
const slashCommands = [
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

// --- STARTUP LOGIC ---
client.once("ready", async () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
    
    try {
        const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
        const clientId = process.env.CLIENT_ID || client.user.id;
        
        console.log('⏳ Registering Slash Commands...');
        await rest.put(Routes.applicationCommands(clientId), { body: slashCommands });
        console.log('✅ Commands Registered!');
    } catch (error) {
        console.error('❌ Command Register Error:', error);
    }
});

// --- CORE IMAGE SENDER ---
async function sendContent(target, category) {
    const data = loadData();
    const images = data[category];

    if (!images || images.length === 0) {
        const msg = `🚫 No images in **${category}**. Admin must add some!`;
        if (target.reply) await target.reply({ content: msg, ephemeral: true }).catch(() => {});
        else target.channel.send(msg).catch(() => {});
        return;
    }

    const randomUrl = images[Math.floor(Math.random() * images.length)];

    const embed = new EmbedBuilder()
        .setColor('#E0115F')
        .setTitle(`Naughty ${category.toUpperCase()}`)
        .setImage(randomUrl)
        .setFooter({ text: "NAUGHTY BOT JJM" });

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`next_${category}`)
            .setLabel('Next ➡️')
            .setStyle(ButtonStyle.Primary)
    );

    try {
        if (target.reply) {
            // Slash Command or Button
            if (target.isButton && target.isButton()) await target.update({ embeds: [embed] });
            else await target.reply({ embeds: [embed], components: [row] });
        } else {
            // Text Command
            await target.channel.send({ embeds: [embed], components: [row] });
        }
    } catch (e) {
        console.error("Send Error:", e);
    }
}

// --- TEXT COMMAND LISTENER ($) ---
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === 'naughty') {
        const category = args[0]?.toLowerCase();
        if (VALID_CATEGORIES.includes(category)) {
            await sendContent(message, category);
        } else {
            message.channel.send(`❌ Invalid category. Try: ${VALID_CATEGORIES.join(', ')}`);
        }
    }
});

// --- INTERACTION LISTENER (/) ---
client.on("interactionCreate", async (interaction) => {
    try {
        if (interaction.isButton()) {
            const [action, category] = interaction.customId.split('_');
            if (action === 'next') await sendContent(interaction, category);
            return;
        }

        if (!interaction.isChatInputCommand()) return;

        if (interaction.commandName === 'naughty') {
            await sendContent(interaction, interaction.options.getSubcommand());
        }

        if (interaction.commandName === 'admin') {
            if (interaction.user.id !== ADMIN_ID) {
                return interaction.reply({ content: "🚫 You are not the admin.", ephemeral: true });
            }

            const sub = interaction.options.getSubcommand();
            const category = interaction.options.getString('category');
            const data = loadData();

            if (sub === 'add') {
                const url = interaction.options.getString('url');
                if (!url.startsWith('http')) return interaction.reply({ content: "Invalid URL.", ephemeral: true });
                
                data[category].push(url);
                saveData(data);
                await interaction.reply({ content: `✅ Added to **${category}**. Total: ${data[category].length}`, ephemeral: true });
            }

            if (sub === 'bulkadd') {
                const file = interaction.options.getAttachment('file');
                if (!file || !file.name.endsWith('.txt')) return interaction.reply({ content: "Please attach a .txt file.", ephemeral: true });
                
                await interaction.deferReply({ ephemeral: true });
                
                // Using built-in global fetch (Node 18+)
                const response = await fetch(file.url);
                const text = await response.text();
                const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.startsWith('http'));
                
                data[category].push(...lines);
                saveData(data);
                
                await interaction.editReply(`✅ Bulk added **${lines.length}** images to **${category}**.`);
            }

            if (sub === 'reset') {
                data[category] = [];
                saveData(data);
                await interaction.reply({ content: `🗑️ **${category}** has been reset.`, ephemeral: true });
            }
        }
    } catch (err) {
        console.error("Interaction Error:", err);
        if (!interaction.replied) await interaction.reply({ content: "Error processing command.", ephemeral: true }).catch(()=>{});
    }
});

// Login
client.login(process.env.TOKEN);
