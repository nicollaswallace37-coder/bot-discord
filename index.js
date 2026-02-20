require("dotenv").config();
const express = require("express");
const app = express();

app.get("/", (req, res) => res.send("Bot online ✅"));
app.listen(process.env.PORT || 3000);

const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ChannelType,
  PermissionFlagsBits,
  REST,
  Routes,
  SlashCommandBuilder,
  Events
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
const PIX = "450.553.628.98";

const MODOS = {
  "1x1": 2,
  "2x2": 4,
  "3x3": 6,
  "4x4": 8
};

const filas = new Map();
const filasTemp = {};
const partidasAtivas = {};
