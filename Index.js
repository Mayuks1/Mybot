import { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import "dotenv/config";
import fs from "fs";
import path from "path";
import fetch from 'node-fetch';

const ADMIN_ID = "934670194096345118"; 
const filePath = path.join(process.cwd(), "images.json");

// Define categories to ensure data integrity
const VALID_CATEGORIES = [
  'girl', 'boy', 'hentai', 'real', 'gif', '4k', 
  'ass', 'tits', 'nude', 'girls', 'anal', 
  'lesbian', 'cum', 'squirt', 'asian', 'normalpics'
];

// ---------- Helper Functions ----------

function loadData() {
  try {
    // Initialize structure if file doesn't exist
    if (!fs.existsSync(filePath)) {
      const initialData = {};
      VALID_CATEGORIES.forEach(cat => initialData[cat] = []);
      fs.writeFileSync(filePath, JSON.stringify(initialData, null, 2));
      return initialData;
    }
    
    const fileContent = fs.readFileSync(filePath, "utf8");
    const data = JSON.parse(fileContent);

    // Ensure all categories exist in the loaded data
    VALID_CATEGORIES.forEach(cat => {
      if (!data[cat]) data[cat] = [];
    });
    
    return data;
  } catch (error) {
    console.error("Error loading data:", error);
    const fallbackData = {};
    VALID_CATEGORIES.forEach(cat => fallbackData[cat] = []);
    return fallbackData;
  }
}

function saveData(data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Error saving data:", error);
  }
}

// ---------- Client Initialization ----------
const token = process.env.TOKEN;
if (!token) {
  console.error("FATAL: Bot token is missing.");
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

// ---------- Interaction Handler ----------
client.on("interactionCreate", async (interaction) => {
  
  // --- Button Interaction (Next Picture) ---
  if (interaction.isButton()) {
    const [action, category] = interaction.customId.split('_');

    if (action === 'next') {
      const data = loadData();
      const images = data[category];

      if (!images || images.length === 0) {
        await interaction.update({ content: "No images found in this category.", embeds: [], components: [] });
        return;
      }

      const randomImageUrl = images[Math.floor(Math.random() * images.length)];
      
      const newEmbed = new EmbedBuilder()
        .setColor("#FF69B4")
        .setTitle(`Naughty ${category.toUpperCase()}!`)
        .setImage(randomImageUrl)
        .setFooter({ text: "NAUGHTY BOT JJM" });
        
      await interaction.update({ embeds: [newEmbed] });
    }
    return;
  }

  // --- Slash Command Interaction ---
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  // --- /naughty [category] ---
  if (commandName === 'naughty') {
    const category = interaction.options.getSubcommand();
    const data = loadData();
    const images = data[category];

    if (!images || images.length === 0) {
      return interaction.reply({ 
        content: `😔 No images have been added to the **${category}** category yet. Ask an admin!`, 
        ephemeral: true 
      });
    }

    const randomImageUrl = images[Math.floor(Math.random() * images.length)];

    const embed = new EmbedBuilder()
      .setColor("#FF69B4")
      .setTitle(`Naughty ${category.toUpperCase()}!`)
      .setImage(randomImageUrl)
      .setFooter({ text: `Category: ${category}` });

    // Custom ID stores the category so the button knows what to fetch next
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`next_${category}`) 
          .setLabel('Next ➡️')
          .setStyle(ButtonStyle.Primary),
      );

    await interaction.reply({ embeds: [embed], components: [row] });
  }

  // --- /admin commands ---
  if (commandName === 'admin') {
    if (interaction.user.id !== ADMIN_ID) {
      return interaction.reply({ content: "🚫 You are not authorized to use this command.", ephemeral: true });
    }

    const subCommand = interaction.options.getSubcommand();
    const category = interaction.options.getString('category');
    const data = loadData();

    // 1. Add Single Picture
    if (subCommand === 'add') {
      const url = interaction.options.getString('url');
      
      // Simple validation
      if (!url.startsWith('http')) {
        return interaction.reply({ content: "Please provide a valid URL starting with http/https.", ephemeral: true });
      }

      data[category].push(url);
      saveData(data);
      
      const embed = new EmbedBuilder()
        .setColor("#00FF00")
        .setTitle("Image Added!")
        .setDescription(`Added to category: **${category}**\nTotal in this category: ${data[category].length}`)
        .setThumbnail(url);

      await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // 2. Bulk Add from TXT
    if (subCommand === 'bulkadd') {
      const file = interaction.options.getAttachment('file');
      
      if (!file.name.endsWith('.txt')) {
        return interaction.reply({ content: "The attached file must be a `.txt` file.", ephemeral: true });
      }
      
      await interaction.deferReply({ ephemeral: true });

      try {
        const response = await fetch(file.url);
        const text = await response.text();
        // Split by new line, remove whitespace, filter empty lines
        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0 && l.startsWith('http'));
        
        // Add all lines to the specific category
        data[category].push(...lines);
        saveData(data);
        
        await interaction.editReply(`✅ **Bulk Add Successful!**\n- Category: **${category}**\n- Added: **${lines.length}** images.\n- New Total: **${data[category].length}**`);
      } catch (error) {
        console.error(error);
        await interaction.editReply("🔴 An error occurred while processing the file.");
      }
    }

    // 3. Reset Category
    if (subCommand === 'reset') {
      data[category] = [];
      saveData(data);
      await interaction.reply({ content: `🧹 Successfully deleted ALL images from **${category}**.`, ephemeral: true });
    }
  }
});

client.login(token);
