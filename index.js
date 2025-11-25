import { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import "dotenv/config";
import fs from "fs";
import path from "path";
import fetch from 'node-fetch';

// CONFIGURATION
const ADMIN_ID = "934670194096345118"; 
const filePath = path.join(process.cwd(), "images.json");

// Define valid categories
const VALID_CATEGORIES = [
  'girl', 'boy', 'hentai', 'real', 'gif', '4k', 
  'ass', 'tits', 'nude', 'girls', 'anal', 
  'lesbian', 'cum', 'squirt', 'asian', 'normalpics'
];

// ---------- ANTI-CRASH HANDLERS ----------
process.on('unhandledRejection', (reason, p) => {
    console.log(' [Anti-Crash] :: Unhandled Rejection/Catch');
    console.log(reason, p);
});
process.on("uncaughtException", (err, origin) => {
    console.log(' [Anti-Crash] :: Uncaught Exception/Catch');
    console.log(err, origin);
});

// ---------- Helper Functions ----------

function loadData() {
  try {
    let data = {};
    
    if (fs.existsSync(filePath)) {
        try {
            const fileContent = fs.readFileSync(filePath, "utf8");
            data = JSON.parse(fileContent);
        } catch (e) {
            console.error("Error parsing JSON, resetting file.");
            data = {};
        }
    }

    // Fix Structure: Ensure all categories exist
    let needsSave = false;
    VALID_CATEGORIES.forEach(cat => {
      if (!Array.isArray(data[cat])) {
        data[cat] = [];
        needsSave = true;
      }
    });

    // Save if we fixed the structure
    if (needsSave) {
        saveData(data);
    }
    
    return data;
  } catch (error) {
    console.error("CRITICAL: Error inside loadData", error);
    // Return empty safe structure to prevent crash
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

// ---------- Client Initialization ----------
const token = process.env.TOKEN;
if (!token) {
  console.error("FATAL: Bot token is missing in .env file.");
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  console.log(`🛡️ Crash protection enabled.`);
});

// ---------- Interaction Handler ----------
client.on("interactionCreate", async (interaction) => {
  try {
      // --- Button Interaction (Next Picture) ---
      if (interaction.isButton()) {
        const parts = interaction.customId.split('_');
        // Handle case where split might fail or old buttons exist
        if (parts.length < 2) return; 

        const action = parts[0];
        const category = parts[1];

        if (action === 'next') {
          const data = loadData();
          const images = data[category];

          if (!images || images.length === 0) {
            await interaction.update({ content: "No images found in this category.", embeds: [], components: [] }).catch(() => {});
            return;
          }

          const randomImageUrl = images[Math.floor(Math.random() * images.length)];
          
          // Validate URL before sending to prevent crash
          if (!randomImageUrl || !randomImageUrl.startsWith('http')) {
              await interaction.update({ content: "Error: Invalid image URL found in database.", embeds: [], components: [] });
              return;
          }

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

        // Validation
        if (!randomImageUrl || !randomImageUrl.startsWith('http')) {
             return interaction.reply({ content: "Found a corrupted image link. Please try again.", ephemeral: true });
        }

        const embed = new EmbedBuilder()
          .setColor("#FF69B4")
          .setTitle(`Naughty ${category.toUpperCase()}!`)
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
          
          if (!url.startsWith('http')) {
            return interaction.reply({ content: "Please provide a valid URL starting with http/https.", ephemeral: true });
          }

          // Initialize if missing (Anti-crash)
          if (!data[category]) data[category] = [];

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
            if (!response.ok) throw new Error("Failed to download file");
            
            const text = await response.text();
            // Safer parsing
            const lines = text.split(/\r?\n/)
                .map(l => l.trim())
                .filter(l => l.length > 5 && l.startsWith('http')); // Basic length check and http check
            
            if (!data[category]) data[category] = [];
            
            data[category].push(...lines);
            saveData(data);
            
            await interaction.editReply(`✅ **Bulk Add Successful!**\n- Category: **${category}**\n- Added: **${lines.length}** images.\n- New Total: **${data[category].length}**`);
          } catch (error) {
            console.error(error);
            await interaction.editReply("🔴 An error occurred while processing the file. Check console for details.");
          }
        }

        // 3. Reset Category
        if (subCommand === 'reset') {
          data[category] = [];
          saveData(data);
          await interaction.reply({ content: `🧹 Successfully deleted ALL images from **${category}**.`, ephemeral: true });
        }
      }

  } catch (err) {
      console.error("Global Interaction Handler Error:", err);
      // Try to reply to the user if possible
      if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ content: "An error occurred while executing this command.", ephemeral: true }).catch(() => {});
      }
  }
});

client.login(token);
