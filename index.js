import { Client, GatewayIntentBits, EmbedBuilder } from "discord.js";
import "dotenv/config";
import fs from "fs";
import path from "path";

const ADMIN_ID = "934670194096345118";
const ROLE_NAME = "GEN ACCESS";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const filePath = path.join(process.cwd(), "accounts.json");

  // Make sure accounts.json exists
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify({ accounts: [] }, null, 2));
  }

  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));

  // ==============================
  // COMMAND: $mcfa gen
  // ==============================
  if (message.content === "$mcfa gen") {
    const account = data.accounts.shift();
    if (!account) {
      return message.reply("❌ No more accounts available right now!");
    }

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

    // Fancy DM embed
    const dmEmbed = new EmbedBuilder()
      .setColor("#00FFAA")
      .setTitle("🎁 Your Free MCFA Account")
      .setDescription(
        `Hello **${message.author.username}**!\n\n` +
          "Here are your account details:\n\n" +
          `> 📧 **Email:** \`${account.email}\`\n` +
          `> 🔐 **Password:** \`${account.password}\`\n\n` +
          "Use it responsibly and keep it safe.\n" +
          "Thank you for using **LoxY Hub** ❤️"
      )
      .setFooter({
        text: "Provided by LoxY Hub  •  Enjoy your free MCFA account!",
      })
      .setTimestamp();

    await message.author.send({ embeds: [dmEmbed] });
    return message.reply("📬 I’ve sent your account details in DM!");
  }

  // ==============================
  // COMMAND: $mcfa add
  // ==============================
  if (message.content.startsWith("$mcfa add ")) {
    if (message.author.id !== ADMIN_ID) {
      return message.reply("🚫 You are not authorized to add accounts.");
    }

    const args = message.content.split(" ");
    if (args.length < 4) {
      return message.reply("Usage: `$mcfa add email password`");
    }

    const email = args[2];
    const password = args[3];
    data.accounts.push({ email, password });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

    return message.reply(`✅ Added new account for **${email}**`);
  }

  // ==============================
  // COMMAND: $stock
  // ==============================
  if (message.content === "$stock") {
    const remaining = data.accounts.length;

    const stockEmbed = new EmbedBuilder()
      .setColor("#0099ff")
      .setTitle("📦  LoxY Hub Stock Information")
      .setDescription(
        `🧮 **Current Stock:** ${remaining} account(s) available\n` +
          `⚙️ Keep generating while supply lasts!\n` +
          `🎮 Join our Discord: https://discord.gg/VVzGgnKqPJ\n` +
          `🚀 Use **$mcfa gen** to claim yours!`
      )
      .setFooter({ text: "LoxY Hub Generator System" })
      .setTimestamp();

    return message.reply({ embeds: [stockEmbed] });
  }

  // ==============================
  // COMMAND: $cstatus (safe verification)
  // ==============================
  if (message.content === "$cstatus") {
    const guild = message.guild;
    const member = await guild.members.fetch(message.author.id);

    // Find or create the role
    let role = guild.roles.cache.find((r) => r.name === ROLE_NAME);
    if (!role) {
      role = await guild.roles.create({
        name: ROLE_NAME,
        color: "#00FFAA",
        reason: "Verification by bot",
      });
    }

    // Add role to member
    await member.roles.add(role);

    // Send embed DM
    const verifyEmbed = new EmbedBuilder()
      .setColor("#00FFAA")
      .setTitle("✅ Verification Complete")
      .setDescription(
        `Hey **${message.author.username}**, you’re now verified in **LoxY Hub**!\n\n` +
          "You have been given the **GEN ACCESS** role.\n" +
          "You can now generate MCFA accounts and view exclusive channels.\n\n" +
          "Invite friends to our server:\n" +
          "👉 **https://discord.gg/VVzGgnKqPJ**"
      )
      .setFooter({ text: "LoxY Hub  •  Welcome aboard!" })
      .setTimestamp();

    await message.author.send({ embeds: [verifyEmbed] });
    return message.reply("🎉 Verified! Check your DMs for details.");
  }
});

// Login the bot
client.login(process.env.TOKEN);