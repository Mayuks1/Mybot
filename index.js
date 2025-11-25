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

// --- CONFIGURATION ---
const ADMIN_ID = "934670194096345118"; 
const filePath = path.join(process.cwd(), "images.json");
const PREFIX = "$"; 

const VALID_CATEGORIES = [
  'girl', 'boy', 'hentai', 'real', 'gif', '4k', 
  'ass', 'tits', 'nude', 'girls', 'anal', 
  'lesbian', 'cum', 'squirt', 'asian', 'normalpics'
];

// --- ANTI-CRASH ---
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

if (!token) {
    console.error("FATAL: TOKEN is missing in .env");
    process.exit(1);
}

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent 
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
  
  const rest = new REST({ version: '10' }).setToken(token);
  const effectiveClientId = clientId || client.user.id;

  try {
    console.log('⏳ Refreshing application (/) commands...');
    await rest.put(Routes.applicationCommands(effectiveClientId), { body: commands });
    console.log('✅ Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error('❌ Error deploying commands:', error);
  }
});

// --- SHARED SENDER ---
async function sendNaughtyImage(target, category) {
    const data = loadData();
    const images = data[category];

    if (!images || images.length === 0) {
        const msg = `🚫 No images found in **${category}**. Admin needs to add some!`;
        if (target.reply) await target.reply({ content: msg, ephemeral: true }).catch(e => console.log(e));
        else target.channel.send(msg).catch(e => console.log(e));
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
        if (target.isButton && target.isButton()) await target.update({ embeds: [embed] });
        else await target.reply({ embeds: [embed], components: [row] });
    } else {
        await target.channel.send({ embeds: [embed], components: [row] });
    }
}

// --- MESSAGE HANDLER ($) ---
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase(); 

    if (command === 'naughty') {
        const category = args[0]?.toLowerCase();
        if (!category) return message.channel.send(`Specify a category! e.g., \`$naughty girl\``);
        
        if (VALID_CATEGORIES.includes(category)) {
            await sendNaughtyImage(message, category);
        } else {
            message.channel.send(`❌ Invalid category.`);
        }
    }
});

// --- INTERACTION HANDLER (/) ---
client.on("interactionCreate", async (interaction) => {
    try {
        if (interaction.isButton()) {
            const parts = interaction.customId.split('_');
            if (parts[0] === 'next') await sendNaughtyImage(interaction, parts[1]);
            return;
        }

        if (!interaction.isChatInputCommand()) return;

        if (interaction.commandName === 'naughty') {
            await sendNaughtyImage(interaction, interaction.options.getSubcommand());
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
                if (!file.name.endsWith('.txt')) return interaction.reply({ content: "File must be .txt", ephemeral: true });
                await interaction.deferReply({ ephemeral: true });
                
                // Using built-in fetch
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
        if (!interaction.replied) await interaction.reply({ content: "Error.", ephemeral: true }).catch(() => {});
    }
});

client.login(token);
