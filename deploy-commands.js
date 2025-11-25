import { REST, Routes, SlashCommandBuilder } from 'discord.js';
import 'dotenv/config';

const token = process.env.TOKEN;
const clientId = process.env.CLIENT_ID;

if (!token || !clientId) {
  console.error("Error: TOKEN or CLIENT_ID is missing from your .env file.");
  process.exit(1);
}

const commands = [
  new SlashCommandBuilder()
    .setName('help-naughty')
    .setDescription('Shows all available commands for the Naughty Bot.'),
  
  new SlashCommandBuilder()
    .setName('naughty-pics')
    .setDescription('Shows a random picture from the collection.'),

  new SlashCommandBuilder()
    .setName('admin')
    .setDescription('Admin commands for managing pictures.')
    .addSubcommand(subcommand =>
      subcommand
        .setName('addpic')
        .setDescription('Adds a single picture to the collection.')
        .addStringOption(option =>
          option.setName('url')
            .setDescription('The direct URL of the image (must end in .png, .jpg, .gif, etc.)')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('bulkaddpics')
        .setDescription('Adds multiple pictures from an attached .txt file.')
        .addAttachmentOption(option =>
          option.setName('file')
            .setDescription('A .txt file with one image URL per line.')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('resetpics')
        .setDescription('DANGER: Deletes all pictures from the collection.')),
]
.map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  try {
    console.log('Started refreshing application (/) commands.');

    await rest.put(
      Routes.applicationCommands(clientId),
      { body: commands },
    );

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
})();
