import { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, REST, Routes, SlashCommandBuilder } from "discord.js";
import "dotenv/config";
import fs from "fs";
import path from "path";
import fetch from 'node-fetch';

// --- CONFIGURATION ---
const ADMIN_ID = "934670194096345118"; 
const filePath = path.join(process.cwd(), "images.json");
const PREFIX = "$"; // Now supports $ commands

const VALID_CATEGORIES = [
  'girl', 'boy', 'hentai', 'real', 'gif', '4k', 
  'ass', 'tits', 'nude', 'girls', 'anal', 
  'lesbian', 'cum', 'squirt', 'asian', 'normalpics'
];

// --- COMMAND DEFINITIONS (Slash) ---
const commands = [
    new SlashCommandBuilder()
        .setName('naughty')
        .setDescription('Get content from a specific category')
        .addSubcommand(sub => sub.setName('girl').setDescription('Get random girl content'))
        .addSubcommand(sub => sub.setName
