import { Client, GatewayIntentBits, EmbedBuilder } from "discord.js";
import "dotenv/config";
import fs from "fs";
import path from "path";

const ADMIN_ID = "934670194096345118";
const GEN_CHANNEL_ID = "1430915160373203136";
const VOUCH_CHANNEL_ID = "1430914635913101312";

const cooldowns = {}; // userId -> timestamp end
const filePath = path.join(process.cwd(), "accounts.json");

// ---------- helpers ----------
function loadData() {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(
      filePath,
      JSON.stringify({ mcfa: [], banned: [], xbox: [] }, null, 2)
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

  // USER HELP
  if (content === "$help" || content === "$mcfa help") {
    const e = new EmbedBuilder()
      .setColor("#00FFAA")
      .setTitle("💬 LoxY Hub — User Help")
      .setDescription(
        "Commands everyone can use:\n" +
          "• `$mcfa gen` – get free MCFA account\n" +
          "• `$mcfa banned` – get banned Minecraft account\n" +
          "• `$mcfa xbox` – get Xbox account\n" +
          "• `$stock` – see stock\n" +
          "• Type `legit` in vouch channel after generating to remove cool‑down 💚"
      );
    return message.reply({ embeds: [e] });
  }

  // ADMIN HELP
  if (content === "$adminhelp") {
    if (message.author.id !== ADMIN_ID)
      return message.reply("🚫 only admin.");
    const e = new EmbedBuilder()
      .setColor("#ff9933")
      .setTitle("🛠 LoxY Hub — Admin Help")
      .setDescription(
        "`$mcfa add mcfa email password` → add normal account\n" +
          "`$mcfa add banned email password` → add banned account\n" +
          "`$mcfa add xbox email password` → add Xbox account\n" +
          "`$mcfa reset mcfa` / `$mcfa reset banned` / `$mcfa reset xbox` → clear lists"
      );
    return message.reply({ embeds: [e] });
  }

  // STOCK
  if (content === "$stock") {
    const e = new EmbedBuilder()
      .setColor("#0099ff")
      .setTitle("📦 Stock")
      .setDescription(
        `🌀 MCFA: ${data.mcfa.length}\n🚫 Banned: ${data.banned.length}\n🎮 Xbox: ${data.xbox.length}`
      );
    return message.reply({ embeds: [e] });
  }

  // ---------------------------------------------------
  // GENERATE FUNCTIONS (anyone)
  async function generate(poolName, color, title, note) {
    if (message.channelId !== GEN_CHANNEL_ID)
      return message.reply("❌ Use this in generator channel only.");
    const id = message.author.id;
    const now = Date.now();
    if (cooldowns[id] && cooldowns[id] > now) {
      const min = Math.ceil((cooldowns[id] - now) / 60000);
      return message.reply(
        `⏳ Please vouch first! Try again after ${min} minutes.`
      );
    }
    const list = data[poolName];
    const acc = list.shift();
    if (!acc) return message.reply(`❌ No ${poolName} accounts available.`);
    saveData(data);

    const dm = new EmbedBuilder()
      .setColor(color)
      .setTitle(title)
      .setDescription(
        `Hey **${message.author.username}**, here’s your ${poolName} account:\n\n` +
          `📧 **Email:** \`${acc.email}\`\n🔐 **Password:** \`${acc.password}\`\n\n` +
          note +
          "\n\n➡️ Go to the vouch channel and say **legit** to remove your 30 min cooldown."
      )
      .setFooter({ text: "LoxY Hub • Enjoy your account" });

    await message.author.send({ embeds: [dm] }).catch(() => {});
    await message.reply("📬 Check DMs for account details!");
    cooldowns[id] = now + 30 * 60 * 1000;
  }

  if (content === "$mcfa gen")
    return generate(
      "mcfa",
      "#00FFAA",
      "🎁 Your MCFA Account",
      "Please keep it private and respect our community rules."
    );
  if (content === "$mcfa banned")
    return generate(
      "banned",
      "#ff5555",
      "🚫 Banned Minecraft Account",
      "These are banned accounts, use for testing only."
    );
  if (content === "$mcfa xbox")
    return generate(
      "xbox",
      "#00a1ff",
      "🎮 Xbox Account",
      "Fresh Xbox combo for practice and login tests."
    );

  // ---------------------------------------------------
  // ADMIN: ADD
  if (content.startsWith("$mcfa add ")) {
    if (message.author.id !== ADMIN_ID)
      return message.reply("🚫 only admin.");
    const args = content.split(" ");
    if (args.length < 5)
      return message.reply(
        "Usage: `$mcfa add mcfa|banned|xbox email password`"
      );
    const pool = args[2].toLowerCase();
    const email = args[3];
    const pass = args[4];
    if (!["mcfa", "banned", "xbox"].includes(pool))
      return message.reply("Pool must be mcfa, banned or xbox.");
    data[pool].push({ email, password: pass });
    saveData(data);
    return message.reply(`✅ Added ${pool} account for ${email}`);
  }

  // ADMIN: RESET
  if (content.startsWith("$mcfa reset ")) {
    if (message.author.id !== ADMIN_ID)
      return message.reply("🚫 only admin.");
    const pool = content.split(" ")[2]?.toLowerCase();
    if (!["mcfa", "banned", "xbox"].includes(pool))
      return message.reply("Pool must be mcfa, banned or xbox.");
    data[pool] = [];
    saveData(data);
    return message.reply(`🧹 Reset all ${pool} accounts.`);
  }
});

// ------------------------------------------------------
//  VOUCH MONITOR — look for “legit” in vouch channel
// ------------------------------------------------------
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (message.channelId !== VOUCH_CHANNEL_ID) return;
  const text = message.content.toLowerCase();
  if (!text.includes("legit")) return;

  try {
    await message.react("✅");
  } catch (e) {
    console.log("React fail:", e.message);
  }

  const uid = message.author.id;
  if (cooldowns[uid]) {
    delete cooldowns[uid];
    const e = new EmbedBuilder()
      .setColor("#00FFAA")
      .setTitle("🙏 Thanks for Vouching!")
      .setDescription(
        `We saw your vouch, **${message.author.username}** ✅\n` +
          "Your cool‑down has been removed. You can use `$mcfa gen` again.\n\n" +
          "Appreciate your help keeping LoxY Hub trusted 💚"
      )
      .setFooter({ text: "LoxY Hub • Community first" })
      .setTimestamp();
    await message.author.send({ embeds: [e] }).catch(() => {});
  }
});

client.login(process.env.TOKEN);