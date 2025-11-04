import { Client, GatewayIntentBits, EmbedBuilder } from "discord.js";
import "dotenv/config";
import fs from "fs";
import path from "path";
import fetch from 'node-fetch';

const ADMIN_ID = "934670194096345118";
const GEN_CHANNEL_ID = "1430915160373203136";
const VOUCH_CHANNEL_ID = "1430914635913101312";
const VOUCH_CHANNEL_LINK = "https://discord.com/channels/1338187650225537044/1430914635913101312";
const EMBED_IMAGE_URL = "https://i.ibb.co/JWkZx3K/image.png";

const cooldowns = {}; // userId -> timestamp end
const filePath = path.join(process.cwd(), "accounts.json");

// ---------- helpers ----------
function loadData() {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(
      filePath,
      JSON.stringify({ mcfa: [], banned: [], xbox: [], bedrock: [] }, null, 2)
    );
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}
function saveData(d) {
  fs.writeFileSync(filePath, JSON.stringify(d, null, 2));
}

// ---------- client ----------
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once("ready", () => console.log(`✅ Logged in as ${client.user.tag}`));

// ------------------------------------------------------
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  const content = message.content.trim();
  const data = loadData();
  const validPools = ["mcfa", "banned", "xbox", "bedrock"];

  // USER HELP
  if (content === "$help" || content === "$mcfa help") {
    const e = new EmbedBuilder()
      .setColor("#00FFAA")
      .setTitle("👋 Proxy Terminal Ind — User Help")
      .setDescription("Here are the commands available to everyone. Use these in the generator channel.")
      .addFields(
        { name: "⛏️ Get MCFA Account", value: "➡️ `$mcfa gen`", inline: true },
        { name: "💎 Get Bedrock Account", value: "➡️ `$mcfa bedrock`", inline: true },
        { name: "\u200B", value: "\u200B" },
        { name: "🚫 Get Banned Account", value: "➡️ `$mcfa banned`", inline: true },
        { name: "🎮 Get Xbox Account", value: "➡️ `$mcfa xbox`", inline: true },
        { name: "\u200B", value: "\u200B" },
        { name: "📦 Check Stock", value: "➡️ `$stock`" },
        { name: "✅ Remove Cooldown", value: `> Type \`legit\` in the <#${VOUCH_CHANNEL_ID}> channel after generating to remove your cool-down!` }
      )
      .setImage(EMBED_IMAGE_URL)
      .setFooter({ text: "Proxy Terminal Ind • Community First" })
      .setTimestamp();
    return message.reply({ embeds: [e] });
  }

  // ADMIN HELP
  if (content === "$adminhelp") {
    if (message.author.id !== ADMIN_ID) return message.reply("🔴 Only the admin can use this command.");
    const e = new EmbedBuilder()
      .setColor("#ff9933")
      .setTitle("🛠️ Proxy Terminal Ind — Admin Help")
      .setDescription("Manage the account generator stock with these commands.")
      .addFields(
        { name: "➕ Add Single Account", value: "`$mcfa add [type] [email] [password]`" },
        { name: "➕ Add Bulk Accounts", value: "`$mcfa bulkadd [type]`\n*Then attach your .txt file to the message.*" },
        { name: "🧹 Reset Stock", value: "`$mcfa reset [type]`" },
        { name: "✅ Valid Types", value: "`mcfa`, `banned`, `xbox`, `bedrock`" }
      )
      .setImage(EMBED_IMAGE_URL)
      .setFooter({ text: "Proxy Terminal Ind • Admin Panel" })
      .setTimestamp();
    return message.reply({ embeds: [e] });
  }

  // STOCK
  if (content === "$stock") {
    const e = new EmbedBuilder()
      .setColor("#0099ff")
      .setTitle("📦 Account Stock")
      .setDescription("Here is the current availability of all account types.")
      .addFields(
        { name: "⛏️ MCFA", value: `**${data.mcfa.length}** accounts`, inline: true },
        { name: "💎 Bedrock", value: `**${data.bedrock.length}** accounts`, inline: true },
        { name: "🚫 Banned", value: `**${data.banned.length}** accounts`, inline: true },
        { name: "🎮 Xbox", value: `**${data.xbox.length}** accounts`, inline: true }
      )
      .setImage(EMBED_IMAGE_URL)
      .setFooter({ text: "Proxy Terminal Ind • Stock Info" })
      .setTimestamp();
    return message.reply({ embeds: [e] });
  }

  // GENERATE FUNCTIONS (Same as before)
  async function generate(poolName, color, title, note) {
    if (message.channelId !== GEN_CHANNEL_ID) return message.reply("🔴 Use this in the designated generator channel only.");
    const id = message.author.id;
    const now = Date.now();
    if (cooldowns[id] && cooldowns[id] > now) {
      const min = Math.ceil((cooldowns[id] - now) / 60000);
      return message.reply(`⏳ Please vouch first to remove your cooldown! Try again in **${min} minute(s)**.`);
    }
    const list = data[poolName];
    const acc = list.shift();
    if (!acc) return message.reply(`🔴 Sorry, there are no **${poolName}** accounts available right now.`);
    saveData(data);
    const dm = new EmbedBuilder()
      .setColor(color)
      .setTitle(title)
      .setDescription(`👋 Hey **${message.author.username}**, here are your account details:`)
      .addFields(
        { name: "📧 Email", value: `\`\`\`${acc.email}\`\`\`` },
        { name: "🔐 Password", value: `\`\`\`${acc.password}\`\`\`` },
        { name: "ℹ️ Important Note", value: note },
        { name: "✅ Remove Cooldown", value: `Go to the [**Vouch Channel by clicking here**](${VOUCH_CHANNEL_LINK}) and simply type **legit** to remove your 30-minute cooldown.` }
      )
      .setImage(EMBED_IMAGE_URL)
      .setFooter({ text: "Proxy Terminal Ind • Enjoy your account" })
      .setTimestamp();
    try {
        await message.author.send({ embeds: [dm] });
        await message.reply("📬 Success! I've sent the account details to your DMs!");
        cooldowns[id] = now + 30 * 60 * 1000;
    } catch (error) {
        list.unshift(acc);
        saveData(data);
        console.log(`Failed to DM user ${message.author.id}`);
        await message.reply("🔴 I couldn't send you a DM! Please enable your DMs from server members and try again.");
    }
  }

  if (content === "$mcfa gen") return generate("mcfa", "#00FFAA", "🎁 Your MCFA Account", "Please keep it private and respect our community rules.");
  if (content === "$mcfa banned") return generate("banned", "#ff5555", "🚫 Banned Minecraft Account", "These are banned accounts, intended for testing purposes only.");
  if (content === "$mcfa xbox") return generate("xbox", "#00a1ff", "🎮 Xbox Account", "Fresh Xbox combo for practice and login tests.");
  if (content === "$mcfa bedrock") return generate("bedrock", "#28a745", "💎 Bedrock Account", "Enjoy your Bedrock account. Please do not change the credentials.");
  
  // ADMIN COMMANDS
  if (content.startsWith("$mcfa add ")) {
    if (message.author.id !== ADMIN_ID) return message.reply("🔴 Only the admin can use this command.");
    const args = content.split(" ");
    if (args.length < 5) return message.reply("Usage: `$mcfa add [type] [email] [password]`");
    const pool = args[2].toLowerCase();
    const email = args[3];
    const pass = args.slice(4).join(' ');
    if (!validPools.includes(pool)) return message.reply(`🔴 Invalid type. Must be one of: ${validPools.join(", ")}.`);
    data[pool].push({ email, password: pass });
    saveData(data);
    return message.reply(`✅ Successfully added a **${pool}** account for \`${email}\``);
  }

  if (content.startsWith("$mcfa reset ")) {
    if (message.author.id !== ADMIN_ID) return message.reply("🔴 Only the admin can use this command.");
    const pool = content.split(" ")[2]?.toLowerCase();
    if (!validPools.includes(pool)) return message.reply(`🔴 Invalid type. Must be one of: ${validPools.join(", ")}.`);
    data[pool] = [];
    saveData(data);
    return message.reply(`🧹 Successfully reset all **${pool}** accounts.`);
  }

  // --- NEW BULK ADD COMMAND ---
  if (content.startsWith("$mcfa bulkadd ")) {
    if (message.author.id !== ADMIN_ID) return message.reply("🔴 Only the admin can use this command.");
    if (message.attachments.size === 0) return message.reply("🔴 Please attach a `.txt` file with the accounts to your message.");
    
    const file = message.attachments.first();
    if (!file.name.endsWith('.txt')) return message.reply("🔴 The attached file must be a `.txt` file.");
    
    const pool = content.split(" ")[2]?.toLowerCase();
    if (!validPools.includes(pool)) return message.reply(`🔴 Invalid type. Usage: \`$mcfa bulkadd [type]\`. Valid types: ${validPools.join(", ")}`);
    
    try {
      const reply = await message.reply("⏳ Reading file... This might take a moment.");
      
      const response = await fetch(file.url);
      if (!response.ok) throw new Error(`Failed to fetch file: ${response.statusText}`);
      
      const text = await response.text();
      const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
      
      let addedCount = 0;
      let skippedCount = 0;

      for (const line of lines) {
        const parts = line.split(/[:\s]/);
        if (parts.length >= 2) {
          const email = parts[0];
          const password = parts.slice(1).join(' ').trim();
          data[pool].push({ email, password });
          addedCount++;
        } else {
          skippedCount++;
        }
      }

      saveData(data);
      const e = new EmbedBuilder()
        .setColor("#00FFAA")
        .setTitle("✅ Bulk Operation Complete!")
        .setDescription(`Successfully added accounts to the **${pool}** pool.`)
        .addFields(
            { name: "Accounts Added", value: `**${addedCount}**`, inline: true },
            { name: "Invalid Lines Skipped", value: `**${skippedCount}**`, inline: true }
        )
        .setFooter({text: "Proxy Terminal Ind • Stock updated"});

      await reply.edit({ content: "", embeds: [e] });

    } catch (error) {
      console.error("Bulk add failed:", error);
      await message.channel.send("🔴 An error occurred while processing the file. Please check the console.");
    }
  }
});

// VOUCH MONITOR
client.on("messageCreate", async (message) => {
  if (message.author.bot || message.channelId !== VOUCH_CHANNEL_ID) return;
  if (message.content.toLowerCase().includes("legit")) {
    try { await message.react("✅"); } catch (e) { console.log("React fail:", e.message); }
    const uid = message.author.id;
    if (cooldowns[uid]) {
      delete cooldowns[uid];
      const e = new EmbedBuilder()
        .setColor("#00FFAA")
        .setTitle("🙏 Thanks for Vouching!")
        .setDescription(`We saw your vouch, **${message.author.username}**!\n\nYour cool-down has been **removed**. You can use the generator again now!\n\nAppreciate your help keeping the community trusted ✅`)
        .setImage(EMBED_IMAGE_URL)
        .setFooter({ text: "Proxy Terminal Ind • Community first" })
        .setTimestamp();
      await message.author.send({ embeds: [e] }).catch(() => {});
    }
  }
});

client.login(process.env.TOKEN);
