import { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, REST, Routes, SlashCommandBuilder } from "discord.js";
import "dotenv/config";
import fs from "fs";
import path from "path";
import fetch from 'node-fetch';

// --- CONFIGURATION ---
const ADMIN_ID = "934670194096345118"; 
const filePath = path.join(process.cwd(), "images.json");

// Define valid categories
const VALID_CATEGORIES = [
  'girl', 'boy', 'hentai', 'real', 'gif', '4k', 
  'ass', 'tits', 'nude', 'girls', 'anal', 
  'lesbian', 'cum', 'squirt', 'asian', 'normalpics'
];

// --- COMMAND DEFINITIONS ---
const commands = [
    // /naughty [category]
    new SlashCommandBuilder()
        .setName('naughty')
        .setDescription('Get content from a specific category')
        .addSubcommand(sub => 
            sub.setName('girl').setDescription('Get random girl content'))
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

    // /admin [add/bulkadd/reset]
    new SlashCommandBuilder()
        .setName('admin')
        .setDescription('Admin commands for managing pictures.')
        .addSubcommand(subcommand =>
            subcommand.setName('add')
                .setDescription('Add a single picture.')
                .addStringOption(option =>
                    option.setName('category')
                        .setDescription('Select the category')
                        .setRequired(true)
                        .addChoices(...VALID_CATEGORIES.map(c => ({ name: c, value: c }))))
                .addStringOption(option =>
                    option.setName('url')
                        .setDescription('The direct URL of the image')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand.setName('bulkadd')
                .setDescription('Add multiple pictures from a .txt file.')
                .addStringOption(option =>
                    option.setName('category')
                        .setDescription('Select the category')
                        .setRequired(true)
                        .addChoices(...VALID_CATEGORIES.map(c => ({ name: c, value: c }))))
                .addAttachmentOption(option =>
                    option.setName('file')
                        .setDescription('A .txt file with one URL per line.')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand.setName('reset')
                .setDescription('DANGER: Deletes all pictures in a specific category.')
                .addStringOption(option =>
                    option.setName('category')
                        .setDescription('Select the category to wipe')
                        .setRequired(true)
                        .addChoices(...VALID_CATEGORIES.map(c => ({ name: c, value: c }))))),
].map(command => command.toJSON());


// --- ANTI-CRASH HANDLERS ---
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
            data = JSON.parse(fs.readFileSync(filePath, "utf8"));
        } catch (e) {
            console.error("JSON corrupted, resetting.");
            data = {};
        }
    }
    // Ensure structure
    let needsSave = false;
    VALID_CATEGORIES.forEach(cat => {
      if (!Array.isArray(data[cat])) {
        data[cat] = [];
        needsSave = true;
      }
    });
    if (needsSave) saveData(data);
    return data;
  } catch (error) {
    const safeData = {};
    VALID_CATEGORIES.forEach(c => safeData[c] = []);
    return safeData;
  }
}

function saveData(data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Error saving data:", error);
  }
}

// --- CLIENT SETUP ---
const token = process.env.TOKEN;
const clientId = process.env.CLIENT_ID;

if (!token) {
  console.error("FATAL: TOKEN is missing in .env");
  process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// --- AUTO DEPLOY COMMANDS ON START ---
client.once("ready", async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  
  const rest = new REST({ version: '10' }).setToken(token);
  // If CLIENT_ID is missing in env, use the bot's own ID
  const effectiveClientId = clientId || client.user.id;

  try {
    console.log('⏳ Refreshing application (/) commands...');
    await rest.put(
      Routes.applicationCommands(effectiveClientId),
      { body: commands },
    );
    console.log('✅ Successfully reloaded application (/) commands.');
    console.log('👉 You may need to restart your Discord app to see changes immediately.');
  } catch (error) {
    console.error('❌ Error deploying commands:', error);
  }
});

// --- INTERACTION HANDLER ---
client.on("interactionCreate", async (interaction) => {
  try {
      // BUTTONS
      if (interaction.isButton()) {
        const parts = interaction.customId.split('_');
        if (parts.length < 2) return; 

        const [action, category] = parts;

        if (action === 'next') {
          const data = loadData();
          const images = data[category];

          if (!images || images.length === 0) {
            return interaction.reply({ content: "No images found here yet.", ephemeral: true }).catch(() => {});
          }

          const randomImageUrl = images[Math.floor(Math.random() * images.length)];
          
          const newEmbed = new EmbedBuilder()
            .setColor("#FF69B4")
            .setTitle(`Naughty ${category.toUpperCase()}`)
            .setImage(randomImageUrl)
            .setFooter({ text: "NAUGHTY BOT JJM" });
            
          await interaction.update({ embeds: [newEmbed] });
        }
        return;
      }

      // SLASH COMMANDS
      if (!interaction.isChatInputCommand()) return;

      const { commandName } = interaction;

      // /naughty
      if (commandName === 'naughty') {
        const category = interaction.options.getSubcommand();
        const data = loadData();
        const images = data[category];

        if (!images || images.length === 0) {
          return interaction.reply({ 
            content: `🚫 No images in **${category}**. Admin needs to add some!`, 
            ephemeral: true 
          });
        }

        const randomImageUrl = images[Math.floor(Math.random() * images.length)];

        const embed = new EmbedBuilder()
          .setColor("#FF69B4")
          .setTitle(`Naughty ${category.toUpperCase()}`)
          .setImage(randomImageUrl)
          .setFooter({ text: `Category: ${category}` });

        const row = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId(`next_${category}`) 
              .setLabel('Next ➡️')
              .setStyle(ButtonStyle.Primary),
          );

        await interaction.reply({ embeds: [embed], components: [row] });
      }

      // /admin
      if (commandName === 'admin') {
        if (interaction.user.id !== ADMIN_ID) {
          return interaction.reply({ content: "🚫 You are not the bot owner!", ephemeral: true });
        }

        const subCommand = interaction.options.getSubcommand();
        const category = interaction.options.getString('category');
        const data = loadData();

        if (subCommand === 'add') {
          const url = interaction.options.getString('url');
          if (!url.startsWith('http')) return interaction.reply({ content: "Invalid URL.", ephemeral: true });

          data[category].push(url);
          saveData(data);
          
          await interaction.reply({ content: `✅ Added to **${category}**. Total: ${data[category].length}`, ephemeral: true });
        }

        if (subCommand === 'bulkadd') {
          const file = interaction.options.getAttachment('file');
          if (!file.name.endsWith('.txt')) return interaction.reply({ content: "File must be .txt", ephemeral: true });
          
          await interaction.deferReply({ ephemeral: true });
          try {
            const res = await fetch(file.url);
            const text = await res.text();
            const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.startsWith('http'));
            
            data[category].push(...lines);
            saveData(data);
            await interaction.editReply(`✅ Added **${lines.length}** images to **${category}**.`);
          } catch (e) {
            await interaction.editReply("❌ Failed to process file.");
          }
        }

        if (subCommand === 'reset') {
          data[category] = [];
          saveData(data);
          await interaction.reply({ content: `🗑️ **${category}** has been emptied.`, ephemeral: true });
        }
      }

  } catch (err) {
      console.error("Interaction Error:", err);
      if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ content: "Error executing command.", ephemeral: true }).catch(() => {});
      }
  }
});

client.login(token);
