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

// --- DEBUG ---
console.log("🚀 Starting Ultimate Bot...");

// --- CONFIGURATION ---
const ADMIN_ID = "934670194096345118"; 
const PREFIX = "$"; 
const filePath = path.join(process.cwd(), "images.json");

// --- THE SECRET SAUCE: SUBREDDIT MAPPING ---
const SUBREDDIT_MAP = {
    'girl': 'RealGirls',
    'boy': 'LadyBoners',
    'hentai': 'hentai',
    'real': 'nsfw',
    'gif': 'NSFW_GIF',
    '4k': 'UHDnsfw',
    'ass': 'ass',
    'tits': 'boobies',
    'nude': 'Nude_Selfie',
    'girls': 'GoneWild',
    'anal': 'anal',
    'lesbian': 'lesbians',
    'cum': 'cumsluts',
    'squirt': 'squirt',
    'asian': 'AsianHotties',
    'normalpics': 'gentlemanboners'
};

const VALID_CATEGORIES = Object.keys(SUBREDDIT_MAP);

// --- ANTI-CRASH ---
process.on('unhandledRejection', (reason) => console.log('❌ [Anti-Crash] Rejection:', reason));
process.on("uncaughtException", (err) => console.log('❌ [Anti-Crash] Exception:', err));

// --- HELPER FUNCTIONS ---
function loadData() {
    try {
        let data = {};
        if (fs.existsSync(filePath)) {
            try { data = JSON.parse(fs.readFileSync(filePath, "utf8")); } catch (e) { data = {}; }
        }
        let saved = false;
        VALID_CATEGORIES.forEach(cat => {
            if (!Array.isArray(data[cat])) { data[cat] = []; saved = true; }
        });
        if (saved) saveData(data);
        return data;
    } catch (e) { return {}; }
}

function saveData(data) {
    try { fs.writeFileSync(filePath, JSON.stringify(data, null, 2)); } catch (e) { console.error(e); }
}

// --- REDDIT FETCHER LOGIC ---
async function fetchFromReddit(category) {
    const subreddit = SUBREDDIT_MAP[category];
    if (!subreddit) return 0;

    try {
        // Fetch Top 60 Hot posts using built-in fetch
        const response = await fetch(`https://www.reddit.com/r/${subreddit}/hot.json?limit=60`);
        const json = await response.json();
        
        if (!json.data || !json.data.children) return 0;

        const data = loadData();
        let addedCount = 0;

        json.data.children.forEach(post => {
            const url = post.data.url;
            // Filter: Must be image, Not Video (unless gif), Not Sticky post
            if (url && !post.data.stickied && !post.data.is_video) {
                if (url.endsWith('.jpg') || url.endsWith('.png') || url.endsWith('.gif') || url.endsWith('.jpeg')) {
                    if (!data[category].includes(url)) {
                        data[category].push(url);
                        addedCount++;
                    }
                }
            }
        });

        if (addedCount > 0) saveData(data);
        return addedCount;

    } catch (error) {
        console.error("Reddit Fetch Error:", error);
        return -1; // Error code
    }
}

// --- CLIENT SETUP ---
if (!process.env.TOKEN) { console.error("⛔ TOKEN MISSING"); process.exit(1); }

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent 
    ] 
});

// --- SLASH COMMAND BUILDER (FIXED DESCRIPTIONS) ---
const slashCommands = [
    new SlashCommandBuilder()
        .setName('naughty')
        .setDescription('Get content')
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
        .setDescription('Admin tools')
        .addSubcommand(sub => 
            sub.setName('refill')
               .setDescription('AUTO-ADD images from Reddit')
               .addStringOption(o => 
                   o.setName('category')
                    .setDescription('Category to refill') // <--- FIXED HERE
                    .setRequired(true)
                    .addChoices(...VALID_CATEGORIES.map(c => ({name: c, value: c})))
                )
        )
        .addSubcommand(sub => 
            sub.setName('reset')
               .setDescription('Clear a category')
               .addStringOption(o => 
                   o.setName('category')
                    .setDescription('Category to empty') // <--- FIXED HERE
                    .setRequired(true)
                    .addChoices(...VALID_CATEGORIES.map(c => ({name: c, value: c})))
                )
        )
].map(c => c.toJSON());

// --- STARTUP ---
client.once("ready", async () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
    try {
        const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
        const clientId = process.env.CLIENT_ID || client.user.id;
        console.log('⏳ Registering Commands...');
        await rest.put(Routes.applicationCommands(clientId), { body: slashCommands });
        console.log('✅ Registered!');
    } catch (e) { console.error(e); }
});

// --- CORE SENDER ---
async function sendContent(target, category) {
    const data = loadData();
    const images = data[category];

    if (!images || images.length === 0) {
        const msg = `🚫 **${category}** is empty! Admin, type \`$refill ${category}\` to auto-fix it.`;
        if (target.reply) await target.reply({ content: msg, ephemeral: true }).catch(()=>{});
        else target.channel.send(msg).catch(()=>{});
        return;
    }

    const randomUrl = images[Math.floor(Math.random() * images.length)];

    const embed = new EmbedBuilder()
        .setColor('#E0115F')
        .setTitle(`Naughty ${category.toUpperCase()}`)
        .setImage(randomUrl)
        .setFooter({ text: "NAUGHTY BOT JJM" });

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`next_${category}`).setLabel('Next ➡️').setStyle(ButtonStyle.Primary)
    );

    try {
        if (target.reply) {
            if (target.isButton && target.isButton()) await target.update({ embeds: [embed] });
            else await target.reply({ embeds: [embed], components: [row] });
        } else {
            await target.channel.send({ embeds: [embed], components: [row] });
        }
    } catch (e) { console.error(e); }
}

// --- MESSAGE COMMANDS ($) ---
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // 1. $naughty [cat]
    if (command === 'naughty') {
        const category = args[0]?.toLowerCase();
        if (VALID_CATEGORIES.includes(category)) await sendContent(message, category);
        else message.channel.send(`❌ Categories: ${VALID_CATEGORIES.join(', ')}`);
    }

    // 2. $upload [cat] (Manual Gallery Upload)
    if (command === 'upload') {
        if (message.author.id !== ADMIN_ID) return message.reply("🚫 Admin only.");
        const category = args[0]?.toLowerCase();
        if (!VALID_CATEGORIES.includes(category)) return message.reply("❌ Invalid category.");
        if (message.attachments.size === 0) return message.reply("⚠️ Attach images!");

        const data = loadData();
        let count = 0;
        message.attachments.forEach(a => {
            if (a.contentType?.startsWith('image/')) { data[category].push(a.url); count++; }
        });
        saveData(data);
        message.reply(`✅ Uploaded **${count}** images to **${category}**.`);
    }

    // 3. $refill [cat] (AUTO REDDIT FETCH)
    if (command === 'refill') {
        if (message.author.id !== ADMIN_ID) return message.reply("🚫 Admin only.");
        const category = args[0]?.toLowerCase();
        if (!VALID_CATEGORIES.includes(category)) return message.reply("❌ Invalid category.");

        const statusMsg = await message.reply(`⏳ Connecting to Reddit to fetch **${category}**...`);
        const added = await fetchFromReddit(category);

        if (added === -1) {
            statusMsg.edit("❌ Error connecting to Reddit. Try again later.");
        } else if (added === 0) {
            statusMsg.edit("⚠️ No *new* images found (or duplicates). Try again tomorrow!");
        } else {
            const data = loadData();
            statusMsg.edit(`✅ **Success!** Automatically snatched **${added}** new hot images for **${category}**.\nTotal in DB: **${data[category].length}**`);
        }
    }
});

// --- INTERACTION COMMANDS (/) ---
client.on("interactionCreate", async (interaction) => {
    try {
        if (interaction.isButton()) {
            const [a, c] = interaction.customId.split('_');
            if (a === 'next') await sendContent(interaction, c);
            return;
        }

        if (!interaction.isChatInputCommand()) return;

        if (interaction.commandName === 'naughty') {
            await sendContent(interaction, interaction.options.getSubcommand());
        }

        if (interaction.commandName === 'admin') {
            if (interaction.user.id !== ADMIN_ID) return interaction.reply({content: "🚫 Admin only", ephemeral: true});
            
            const sub = interaction.options.getSubcommand();
            const category = interaction.options.getString('category');

            if (sub === 'refill') {
                await interaction.deferReply({ephemeral: true});
                const added = await fetchFromReddit(category);
                if (added > 0) await interaction.editReply(`✅ Auto-added **${added}** images to **${category}**.`);
                else await interaction.editReply(`⚠️ Found 0 new images.`);
            }

            if (sub === 'reset') {
                const data = loadData();
                data[category] = [];
                saveData(data);
                await interaction.reply({content: `🗑️ **${category}** emptied.`, ephemeral: true});
            }
        }
    } catch (e) {
        if (!interaction.replied) await interaction.reply({content: "Error.", ephemeral: true}).catch(()=>{});
    }
});

client.login(process.env.TOKEN);
