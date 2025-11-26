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
        .addSubcommand(sub => 
            sub.setName('reset')
               .setDescription('Delete category')
               .addStringOption(o => 
                   o.setName('category')
                    .setDescription('Select category to wipe')
                    .setRequired(true)
                    .addChoices(...VALID_CATEGORIES.map(c => ({name: c, value: c})))
               )
        )
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
            if (target.isButton && target.isButton()) await target.update({ embeds: [embed] });
            else await target.reply({ embeds: [embed], components: [row] });
        } else {
            await target.channel.send({ embeds: [embed], components: [row] });
        }
    } catch (e) {
        console.error("Send Error:", e);
    }
}

// --- TEXT COMMANDS (Now Includes Direct Upload) ---
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // 1. $naughty [category]
    if (command === 'naughty') {
        const category = args[0]?.toLowerCase();
        if (VALID_CATEGORIES.includes(category)) {
            await sendContent(message, category);
        } else {
            message.channel.send(`❌ Invalid category. Try: ${VALID_CATEGORIES.join(', ')}`);
        }
    }

    // 2. $upload [category] (NEW FEATURE)
    if (command === 'upload') {
        // Security Check
        if (message.author.id !== ADMIN_ID) {
            return message.reply("🚫 Only the Admin can upload.");
        }

        const category = args[0]?.toLowerCase();

        // Category Validation
        if (!category || !VALID_CATEGORIES.includes(category)) {
            return message.reply(`⚠️ Please specify a valid category.\nExample: \`$upload girl\` (and attach images)\nValid: ${VALID_CATEGORIES.join(', ')}`);
        }

        // Check Attachments
        if (message.attachments.size === 0) {
            return message.reply("⚠️ You didn't attach any images! Select photos from your gallery and try again.");
        }

        const data = loadData();
        let addedCount = 0;

        // Loop through all images sent
        message.attachments.forEach(attachment => {
            // Check if it's an image or video
            const isImage = attachment.contentType?.startsWith('image/') || attachment.contentType?.startsWith('video/');
            if (isImage) {
                data[category].push(attachment.url);
                addedCount++;
            }
        });

        if (addedCount > 0) {
            saveData(data);
            message.reply(`✅ **Boom!** Automatically saved **${addedCount}** new images to **${category}**.\nTotal in category: **${data[category].length}**`);
        } else {
            message.reply("❌ Could not save those files. Are they images?");
        }
    }
});

// --- INTERACTION LISTENER ---
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

            if (sub === 'reset') {
                data[category] = [];
                saveData(data);
                await interaction.reply({ content: `🗑️ **${category}** has been reset.`, ephemeral: true });
            }
        }
    } catch (err) {
        if (!interaction.replied) await interaction.reply({ content: "Error.", ephemeral: true }).catch(()=>{});
    }
});

client.login(process.env.TOKEN);
