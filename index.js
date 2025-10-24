import { Client, GatewayIntentBits, EmbedBuilder } from "discord.js";
import "dotenv/config";
import fs from "fs";
import path from "path";

const ADMIN_ID = "934670194096345118";
const ROLE_MEMBER = "MEMBER";
const ROLE_GEN = "GEN ACCESS";

// IDs for your channels
const GEN_CHANNEL_ID = "1430915160373203136";
const VOUCH_CHANNEL_ID = "1430914635913101312";

// Cooldown tracker
const cooldowns = {};

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
  ],
});

client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

// ===============================
// MAIN COMMAND HANDLER
// ===============================
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  
  const filePath = path.join(process.cwd(), "accounts.json");
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify({ accounts: [] }, null, 2));
  }
  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
  
  // ==============================
  // $verify – ask user to set status and give role
  // ==============================
  if (message.content === "$verify") {
    const guild = message.guild;
    const member = await guild.members.fetch(message.author.id);
    
    const roleMember = guild.roles.cache.find((r) => r.name === ROLE_MEMBER);
    let roleGen = guild.roles.cache.find((r) => r.name === ROLE_GEN);
    if (!roleGen) {
      roleGen = await guild.roles.create({
        name: ROLE_GEN,
        color: "#00FFAA",
        reason: "Automatic verification role",
      });
    }
    
    if (roleMember) await member.roles.remove(roleMember).catch(() => {});
    await member.roles.add(roleGen);
    
    const verifyEmbed = new EmbedBuilder()
      .setColor("#00FFAA")
      .setTitle("✅ Verified in LoxY Hub")
      .setDescription(
        `Thank you, **${message.author.username}**!\n\n` +
        "Make sure your Discord status says:\n" +
        "```Join Dc https://discord.gg/VVzGgnKqPJ Free Mcfa```\n\n" +
        "You now have the **GEN ACCESS** role and can use generator commands.\n\n" +
        "Invite friends & help our community grow ❤️"
      )
      .setFooter({ text: "LoxY Hub • Welcome aboard!" })
      .setTimestamp();
    
    await message.author.send({ embeds: [verifyEmbed] }).catch(() => {});
    return message.reply("🎉 Verified! Check your DMs for more info.");
  }
  
  // ==============================
  // $unverify – remove Gen role, give Member back
  // ==============================
  if (message.content === "$unverify") {
    const guild = message.guild;
    const member = await guild.members.fetch(message.author.id);
    let roleMember = guild.roles.cache.find((r) => r.name === ROLE_MEMBER);
    if (!roleMember) {
      roleMember = await guild.roles.create({ name: ROLE_MEMBER, color: "#777777" });
    }
    const roleGen = guild.roles.cache.find((r) => r.name === ROLE_GEN);
    
    if (roleGen) await member.roles.remove(roleGen).catch(() => {});
    await member.roles.add(roleMember);
    
    return message.reply("You are now unverified and back to MEMBER role.");
  }
  
  // ==============================
  // $mcfa gen – works only in GEN_CHANNEL_ID & not on cooldown
  // ==============================
  if (message.content === "$mcfa gen") {
    if (message.channelId !== GEN_CHANNEL_ID)
      return message.reply("❌ Use this command only in the gen channel.");
    
    const userId = message.author.id;
    const now = Date.now();
    if (cooldowns[userId] && cooldowns[userId] > now) {
      const remaining = Math.ceil((cooldowns[userId] - now) / 60000);
      return message.reply(
        `⏳ You must vouch first! You can use **$mcfa gen** again in ${remaining} min.`
      );
    }
    
    const account = data.accounts.shift();
    if (!account) return message.reply("❌ No more accounts available!");
    
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    
    const dmEmbed = new EmbedBuilder()
      .setColor("#00FFAA")
      .setTitle("🎁 Your Free MCFA Account")
      .setDescription(
        `Hello **${message.author.username}**!\n\n` +
        `> 📧 **Email:** \`${account.email}\`\n` +
        `> 🔐 **Password:** \`${account.password}\`\n\n` +
        "Please vouch for us in our vouch channel so others know it’s legit!\n" +
        `Type **Legit Got Mcfa** here:\n` +
        `👉 [Vouch Channel](https://discord.com/channels/1338187650225537044/${VOUCH_CHANNEL_ID})\n\n` +
        "Once you vouch, you can generate again immediately.\n\n" +
        "❤️ Thank you for supporting **LoxY Hub Community!**"
      )
      .setFooter({ text: "LoxY Hub • Enjoy your account" })
      .setTimestamp();
    
    await message.author.send({ embeds: [dmEmbed] }).catch(() => {});
    await message.reply("📬 Account sent in DM! Don’t forget to vouch 🙌");
    
    // Put user on 30‑min cooldown until they vouch
    cooldowns[userId] = now + 30 * 60 * 1000;
    return;
  }
  
  // ==============================
  // $vouched – removes cooldown early
  // ==============================
  if (message.content === "$vouched") {
    const userId = message.author.id;
    if (!cooldowns[userId]) {
      return message.reply("You already can use $mcfa gen anytime!");
    }
    delete cooldowns[userId];
    return message.reply("🎉 Thanks for vouching! You can use $mcfa gen again now.");
  }
  
  // ==============================
  // $mcfa add – admin only
  // ==============================
  if (message.content.startsWith("$mcfa add ")) {
    if (message.author.id !== ADMIN_ID)
      return message.reply("🚫 Only admin can add accounts.");
    
    const args = message.content.split(" ");
    if (args.length < 4)
      return message.reply("Usage: `$mcfa add email password`");
    
    const email = args[2];
    const password = args[3];
    data.accounts.push({ email, password });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    
    return message.reply(`✅ Added account for **${email}**`);
  }
  
  // ==============================
  // $stock – show how many left
  // ==============================
  if (message.content === "$stock") {
    const remaining = data.accounts.length;
    const stockEmbed = new EmbedBuilder()
      .setColor("#0099ff")
      .setTitle("📦 LoxY Hub Stock")
      .setDescription(
        `🧮 **Current Stock:** ${remaining} accounts available\n` +
        `⚙️ Use **$mcfa gen** in the generator channel!`
      )
      .setFooter({ text: "LoxY Hub Stock System" })
      .setTimestamp();
    return message.reply({ embeds: [stockEmbed] });
  }
});

// ==============================
client.login(process.env.TOKEN);