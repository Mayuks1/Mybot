import { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import "dotenv/config"; // Still useful for local testing
import fs from "fs";
import path from "path";
import fetch from 'node-fetch';

// Make sure your Admin ID is set correctly
const ADMIN_ID = "934670194096345118"; 
const filePath = path.join(process.cwd(), "images.json");

// ---------- Robust Helper Functions ----------

function loadData() {
  try {
    if (!fs.existsSync(filePath)) {
      console.log("images.json not found, creating a new one.");
      fs.writeFileSync(filePath, JSON.stringify({ imageUrls: [] }, null, 2));
      return { imageUrls: [] };
    }
    const fileContent = fs.readFileSync(filePath, "utf8");
    return JSON.parse(fileContent);
  } catch (error) {
    console.error("CRITICAL ERROR: Could not load or parse images.json!", error);
    // In case of a crash, return an empty list to prevent the bot from stopping.
    return { imageUrls: [] };
  }
}

function saveData(data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("CRITICAL ERROR: Could not save data to images.json!", error);
  }
}

// ---------- Client Initialization ----------
const token = process.env.TOKEN;
if (!token) {
  console.error("FATAL: Bot token is not provided! Make sure TOKEN is set in your environment variables.");
  process.exit(1); // Exit the process if the token is missing
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.once("ready", () => {
  console.log(`✅ Logged in as NAUGHTY BOT JJM (${client.user.tag})`);
});

// ---------- Interaction Handler (No changes needed here) ----------
client.on("interactionCreate", async (interaction) => {
  // --- Button Interaction ---
  if (interaction.isButton()) {
    if (interaction.customId === 'next-naughty-pic') {
      const data = loadData();
      if (data.imageUrls.length <= 1) {
        await interaction.update({ content: "This is the only picture available!", components: [] });
        return;
      }
      
      const randomImageUrl = data.imageUrls[Math.floor(Math.random() * data.imageUrls.length)];
      
      const newEmbed = new EmbedBuilder()
        .setColor("#FF69B4")
        .setTitle("Naughty Pic!")
        .setImage(randomImageUrl)
        .setFooter({ text: "NAUGHTY BOT JJM" });
        
      await interaction.update({ embeds: [newEmbed] });
    }
    return;
  }

  // --- Slash Command Interaction ---
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  // --- User Commands ---
  if (commandName === 'help-naughty') {
    const helpEmbed = new EmbedBuilder()
      .setColor("#0099ff")
      .setTitle("NAUGHTY BOT JJM - Help Menu")
      .setDescription("Here are all the commands you can use:")
      .addFields(
        { name: "`/naughty-pics`", value: "Shows a random picture from the collection with a 'Next' button to see more." },
        { name: "`/admin addpic`", value: "*(Admin Only)* Adds a single picture using a URL." },
        { name: "`/admin bulkaddpics`", value: "*(Admin Only)* Adds many pictures from a `.txt` file." },
        { name: "`/admin resetpics`", value: "*(Admin Only)* Deletes all pictures." }
      )
      .setFooter({ text: "Enjoy the bot!" });
    await interaction.reply({ embeds: [helpEmbed], ephemeral: true });
  }

  if (commandName === 'naughty-pics') {
    const data = loadData();
    if (!data.imageUrls || data.imageUrls.length === 0) {
      return interaction.reply({ content: "Sorry, the admin hasn't added any pictures yet!", ephemeral: true });
    }
    
    const randomImageUrl = data.imageUrls[Math.floor(Math.random() * data.imageUrls.length)];
    
    const embed = new EmbedBuilder()
      .setColor("#FF69B4")
      .setTitle("Naughty Pic!")
      .setImage(randomImageUrl)
      .setFooter({ text: "NAUGHTY BOT JJM" });

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('next-naughty-pic')
          .setLabel('Next ➡️')
          .setStyle(ButtonStyle.Primary),
      );

    await interaction.reply({ embeds: [embed], components: [row] });
  }

  // --- Admin Commands ---
  if (commandName === 'admin') {
    if (interaction.user.id !== ADMIN_ID) {
      return interaction.reply({ content: "🚫 You do not have permission to use this command.", ephemeral: true });
    }

    const subCommand = interaction.options.getSubcommand();
    const data = loadData();

    if (subCommand === 'addpic') {
      const url = interaction.options.getString('url');
      if (!url.match(/\.(jpeg|jpg|gif|png)$/)) {
        return interaction.reply({ content: "🔴 Please provide a valid direct image URL (ending in .jpg, .png, etc.).", ephemeral: true });
      }
      data.imageUrls.push(url);
      saveData(data);
      await interaction.reply({ content: `✅ Successfully added the image! Total pictures: **${data.imageUrls.length}**`, ephemeral: true });
    }

    if (subCommand === 'bulkaddpics') {
      const file = interaction.options.getAttachment('file');
      if (!file.name.endsWith('.txt')) {
        return interaction.reply({ content: "🔴 The attached file must be a `.txt` file.", ephemeral: true });
      }
      
      await interaction.deferReply({ ephemeral: true });

      try {
        const response = await fetch(file.url);
        const text = await response.text();
        const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0 && line.startsWith('http'));
        
        let addedCount = 0;
        for (const line of lines) {
          if (line.match(/\.(jpeg|jpg|gif|png)$/)) {
            data.imageUrls.push(line);
            addedCount++;
          }
        }
        
        saveData(data);
        await interaction.editReply(`✅ **Bulk add complete!**\n- Added **${addedCount}** new pictures.\n- Total pictures now: **${data.imageUrls.length}**`);
      } catch (error) {
        console.error(error);
        await interaction.editReply("🔴 An error occurred while processing the file.");
      }
    }

    if (subCommand === 'resetpics') {
      data.imageUrls = [];
      saveData(data);
      await interaction.reply({ content: "🧹 Successfully deleted all pictures from the collection.", ephemeral: true });
    }
  }
});

client.login(token);
