import { Client, GatewayIntentBits, EmbedBuilder } from "discord.js";
import "dotenv/config";
import fs from "fs";
import path from "path";

const ADMIN_ID = "934670194096345118";
const ROLE_MEMBER = "MEMBER";
const ROLE_GEN = "GEN ACCESS";

// your specific channel IDs
const GEN_CHANNEL_ID = "1430915160373203136";
const VOUCH_CHANNEL_ID = "1430914635913101312";

// store cooldowns (user ID → timestamp)
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

// ========================================================
//  Handle all commands
// ========================================================
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const filePath = path.join(process.cwd(), "accounts.json");
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify({ accounts: [] }, null, 2));
  }
  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));

  // ------------------------------------------------------
  //  ADMIN: give generator access  -> $mcfa add access @user
  // ------------------------------------------------------
  if (message.content.startsWith("$mcfa add access")) {
    if (message.author.id !== ADMIN_ID)
      return message.reply("🚫 Only the bot admin can grant access.");

    const mentioned = message.mentions.members.first();
    if (!mentioned)
      return message.reply("Please mention a user to give generator access.");

    const guild = message.guild;
    const member = await guild.members.fetch(mentioned.id);

    // create roles if missing
    let roleGen = guild.roles.cache.find((r) => r.name === ROLE_GEN);
    if (!roleGen) {
      roleGen = await guild.roles.create({
        name: ROLE_GEN,
        color: "#00FFAA",
        reason: "Generator access role",
      });
    }
    let roleMember = guild.roles.cache.find((r) => r.name === ROLE_MEMBER);
    if (!roleMember) {
      roleMember = await guild.roles.create({
        name: ROLE_MEMBER,
        color: "#777777",
      });
    }

    // switch roles
    await member.roles.remove(roleMember).catch(() => {});
    await member.roles.add(roleGen).catch(() => {});

    // embed DM
    const dm = new EmbedBuilder()
      .setColor("#00FFAA")
      .setTitle("🎉 Access Granted – LoxY Hub")
      .setDescription(
        `Hey **${member.user.username}**!\n\n` +
          "You’ve been granted **generator access** in **LoxY Hub**.\n" +
          "You now have the **GEN ACCESS** role and can use all generator commands in the generator channel.\n\n" +
          "Be respectful – don’t spam, and vouch after claiming an account.\n\n" +
          "Welcome to the core of LoxY Hub! 💚"
      )
      .setFooter({ text: "LoxY Hub • Enjoy responsibly" })
      .setTimestamp();

    await member.send({ embeds: [dm] }).catch(() => {});
    return message.reply(`✅ Access granted to ${member.user.username}.`);
  }

  // ------------------------------------------------------
  //  $mcfa gen
  // ------------------------------------------------------
  if (message.content === "$mcfa gen") {
    if (message.channelId !== GEN_CHANNEL_ID)
      return message.reply("❌ Use this command only in the generator channel.");

    const userId = message.author.id;
    const now = Date.now();

    if (cooldowns[userId] && cooldowns[userId] > now) {
      const remaining = Math.ceil((cooldowns[userId] - now) / 60000);
      return message.reply(
        `⏳ You must vouch first before generating again. Try again in ${remaining} minute(s).`
      );
    }

    const account = data.accounts.shift();
    if (!account) return message.reply("❌ No more accounts available!");

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

    // DM embed for account details
    const dmEmbed = new EmbedBuilder()
      .setColor("#00FFAA")
      .setTitle("🎁 Your Free MCFA Account – LoxY Hub")
      .setDescription(
        `Hey **${message.author.username}**, here’s your new MCFA account:\n\n` +
          `> 📧 **Email:** \`${account.email}\`\n` +
          `> 🔐 **Password:** \`${account.password}\`\n\n` +
          "📣 **Vouch required!** Please go to our vouch channel and post the line:\n" +
          `> *Legit Got Mcfa*\n\n` +
          `Vouch Channel → <https://discord.com/channels/1338187650225537044/${VOUCH_CHANNEL_ID}>\n\n` +
          "After you vouch, the bot will automatically mark it ✅ and remove your 30‑minute cooldown.\n" +
          "Thank you for supporting **LoxY Hub Community!** 💚"
      )
      .setFooter({ text: "LoxY Hub • Enjoy your account" })
      .setTimestamp();

    await message.author.send({ embeds: [dmEmbed] }).catch(() => {});
    await message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor("#00FFAA")
          .setDescription(
            "📬 **Check your DMs!** Your account details are waiting there with all info. 💚"
          ),
      ],
    });

    cooldowns[userId] = now + 30 * 60 * 1000; // 30‑minute cooldown
    return;
  }

  // ------------------------------------------------------
  //  $mcfa add (account)
  // ------------------------------------------------------
  if (message.content.startsWith("$mcfa add ")) {
    if (message.author.id !== ADMIN_ID)
      return message.reply("🚫 Only admin can add accounts.");

    const args = message.content.split(" ");
    if (args.length < 4)
      return message.reply("Usage: `$mcfa add email password`");

    const email = args[2];
    const password = args[3];
    data.accounts.push({ email, password });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return message.reply(`✅ Added account for **${email}**`);
  }

  // ------------------------------------------------------
  //  $stock
  // ------------------------------------------------------
  if (message.content === "$stock") {
    const remaining = data.accounts.length;
    const embed = new EmbedBuilder()
      .setColor("#0099ff")
      .setTitle("📦 LoxY Hub Stock")
      .setDescription(
        `🧮 **Current Stock:** ${remaining} available\n` +
          "⚙️ Use **$mcfa gen** in the generator channel!\n" +
          "💬 Join LoxY Hub → https://discord.gg/VVzGgnKqPJ"
      )
      .setFooter({ text: "LoxY Hub • Stock System" })
      .setTimestamp();
    return message.reply({ embeds: [embed] });
  }
});

// ========================================================
//  AUTO vouched detection in the vouch channel
// ========================================================
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (message.channelId !== VOUCH_CHANNEL_ID) return;

  const content = message.content.toLowerCase();
  if (content.includes("legit")) {
    try {
      await message.react("✅");
    } catch (err) {
      console.error("Failed to react:", err.message);
    }

    const uid = message.author.id;
    if (cooldowns[uid]) {
      delete cooldowns[uid];

      const thankEmbed = new EmbedBuilder()
        .setColor("#00FFAA")
        .setTitle("🙏 Thanks for Vouching – LoxY Hub")
        .setDescription(
          `Hey **${message.author.username}**,\n\n` +
            "Your vouch has been noticed ✅ — thank you for confirming that the generator worked smoothly!\n\n" +
            "Your cooldown has been removed; you can now generate again immediately.\n\n" +
            "Community appreciation like yours keeps **LoxY Hub** growing stronger every day. 💚"
        )
        .setFooter({ text: "LoxY Hub • Appreciation System" })
        .setTimestamp();

      await message.author.send({ embeds: [thankEmbed] }).catch(() => {});
    }
  }
});

client.login(process.env.TOKEN);