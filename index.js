import { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import "dotenv/config";
import fs from "fs";
import path from "path";
import fetch from 'node-fetch';

const ADMIN_ID = "934670194096345118"; // <--- IMPORTANT: SET YOUR ADMIN DISCORD ID
const filePath = path.join(process.cwd(), "images.json");

// ---------- Helper Functions ----------
function loadData() {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify({ imageUrls: [] }, null, 2));
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function saveData(data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// ---------- Client Initialization ----------
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.once("ready", () => {
  console.log(`✅ Logged in as NAUGHTY BOT JJM (${client.user.tag})`);
});

// ---------- Interaction Handler ----------
client.on("interactionCreate", async (interaction) => {
  // --- Button Interaction ---
  if (interaction.isButton()) {
    if (interaction.customId === 'next-naughty-pic') {
      const data = loadData();
      if (data.imageUrls.length <= 1) { // No other pics to show
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

  if (commandName === 'naughty
