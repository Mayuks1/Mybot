import { Client, GatewayIntentBits } from 'discord.js';
import 'dotenv/config';
import fs from 'fs';
import path from 'path';

// Only this Discord ID can add accounts
const ADMIN_ID = '934670194096345118';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const filePath = path.join(process.cwd(), 'accounts.json');
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  // --- Command: $mcfa gen ---
  if (message.content === '$mcfa gen') {
    const account = data.accounts.shift();
    if (!account) return message.reply('No more accounts available 😢');

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    await message.author.send(`Here is your MCFA account:\n**Email:** ${account.email}\n**Password:** ${account.password}`);
    return message.reply('I sent you the account by DM 📬');
  }

  // --- Command: $mcfa add email password ---
  if (message.content.startsWith('$mcfa add ')) {
    if (message.author.id !== ADMIN_ID)
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
});

client.login(process.env.TOKEN);