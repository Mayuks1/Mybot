import { REST, Routes, SlashCommandBuilder } from 'discord.js';
import 'dotenv/config';

const token = process.env.TOKEN;
const clientId = process.env.CLIENT_ID;

if (!token || !clientId) {
  console.error("Error: TOKEN or CLIENT_ID is missing from your .env file.");
  process.exit(1);
}

// List of categories
const categories = [
  'girl', 'boy', 'hentai', 'real', 'gif', '4k', 
  'ass', 'tits', 'nude', 'girls', 'anal', 
  'lesbian', 'cum', 'squirt', 'asian', 'normalpics'
];

// Build the /naughty command with subcommands for each category
const naughtyCommand = new SlashCommandBuilder()
  .setName('naughty')
  .setDescription('Get content from a specific category');

categories.forEach(cat => {
  naughtyCommand.addSubcommand(sub => 
    sub.setName(cat).setDescription(`Get a random ${cat} image/gif`)
  );
});

// Build the /admin command
const adminCommand = new SlashCommandBuilder()
  .setName('admin')
  .setDescription('Admin commands for managing pictures.')
  .addSubcommand(subcommand =>
    subcommand
      .setName('add')
      .setDescription('Add a single picture to a category.')
      .addStringOption(option =>
        option.setName('category')
          .setDescription('Select the category')
          .setRequired(true)
          .addChoices(...categories.map(c => ({ name: c, value: c }))))
      .addStringOption(option =>
        option.setName('url')
          .setDescription('The direct URL of the image')
          .setRequired(true)))
  .addSubcommand(subcommand =>
    subcommand
      .setName('bulkadd')
      .setDescription('Add multiple pictures from a .txt file.')
      .addStringOption(option =>
        option.setName('category')
          .setDescription('Select the category')
          .setRequired(true)
          .addChoices(...categories.map(c => ({ name: c, value: c }))))
      .addAttachmentOption(option =>
        option.setName('file')
          .setDescription('A .txt file with one URL per line.')
          .setRequired(true)))
  .addSubcommand(subcommand =>
    subcommand
      .setName('reset')
      .setDescription('DANGER: Deletes all pictures in a specific category.')
      .addStringOption(option =>
        option.setName('category')
          .setDescription('Select the category to wipe')
          .setRequired(true)
          .addChoices(...categories.map(c => ({ name: c, value: c })))));

const commands = [naughtyCommand, adminCommand].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  try {
    console.log('Started refreshing application (/) commands.');
    await rest.put(Routes.applicationCommands(clientId), { body: commands });
    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
})();
