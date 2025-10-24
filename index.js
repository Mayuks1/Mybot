// ===== MCFA Discord Bot =====
// Full updated index.js with $mcfa add, $mcfa gen and $stock commands

import { Client, GatewayIntentBits, EmbedBuilder } from 'discord.js';
import 'dotenv/config';
import fs from 'fs';
import path from 'path';

// Only you can add accounts (your Discord user ID)
const ADMIN_ID = '934670194096345118';

// Create the bot client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// When bot starts
client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

// When someone sends a message
client.on('messageCreate', async (message) => {
  if (message.author.bot) return; // ignore bots

  const filePath = path.join(process.cwd(), 'accounts.json');

  // Load the accounts.json file, if empty create default
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify({ accounts: [] }, null, 2));
  }

  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  // ===== Command: $mcfa gen =====
  if (message.content === '$mcfa gen') {
    const account = data.accounts.shift(); // take first available
    if (!account) {
      return message.reply('No more accounts available 😢');
    }

    // Save after removing that one
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

    // Send privately
    await message.author.send(
      `Here is your MCFA account:\n**Email:** ${account.email}\n**Password:** ${account.password}`
    );

    // Public confirmation
    return message.reply('📬 I sent you the account in your DMs!');
  }

  // ===== Command: $mcfa add email password =====
  if (message.content.startsWith('$mcfa add ')) {
    if (message.author.id !== ADMIN_ID) {
      return message.reply('🚫 You are not authorized to add accounts.');
    }

    const args = message.content.split(' ');
    if (args.length < 4) {
      return message.reply('Usage: `$mcfa add email password`');
    }

    const email = args[2];
    const password = args[3];
    data.accounts.push({ email, password });

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

    return message.reply(`✅ Added account for **${email}**`);
  }

  // ===== Command: $stock =====
  if (message.content === '$stock') {
    const remaining = data.accounts.length;

    const stockEmbed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('📦 MCFA Stock Information')
      .setDescription(
        `:reddot: **Current Stock:** ${remaining} account(s) available!\n` +
          `:Loadbounce: Keep generating while supply lasts!\n\n` +
          `:yes: Working perfectly!\n` +
          `:Minecraft: Thanks for supporting MCFA!\n` +
          `:hey: Be patient—more coming soon!\n` +
          `:op:→ Go claim one with **$mcfa gen**`
      )
      .setFooter({ text: 'Stock Checker' })
      .setTimestamp();

    return message.reply({ embeds: [stockEmbed] });
  }
});

// Login using the secret token stored in Zeabur
client.login(process.env.TOKEN);    if (message.author.id !== ADMIN_ID)
      return message.reply('🚫 You are not authorized to add accounts.');

    const args = message.content.split(' ');
    if (args.length < 4)
      return message.reply('Usage: `$mcfa add email password`');

    const email = args[2];
    const password = args[3];
    data.accounts.push({ email, password });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

    return message.reply(`✅ Added account for **${email}**`);
  }

  // === $stock ===
  if (message.content === '$stock') {
    const remaining = data.accounts.length;

    // build an embed
    const stockEmbed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('📦 MCFA Stock Information')
      .setDescription(
        `:reddot: **Current Stock:** ${remaining} account(s) available!\n` +
        `:Loadbounce: Keep generating while supply lasts!\n\n` +
        `:yes: Working perfectly!\n` +
        `:Minecraft: Thanks for supporting MCFA!\n` +
        `:hey: Be patient—more coming soon!\n` +
        `:op:→ Go claim one with **$mcfa gen**`
      )
      .setFooter({ text: 'Stock Checker' })
      .setTimestamp();

    return message.reply({ embeds: [stockEmbed] });
  }
});

client.login(process.env.TOKEN);
