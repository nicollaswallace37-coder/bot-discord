require("dotenv").config();

const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Bot online ✅");
});

app.listen(PORT, () => {
  console.log("🌐 Servidor rodando na porta", PORT);
});

const {
  Client,
  GatewayIntentBits,
  ChannelType,
  PermissionsBitField,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  SlashCommandBuilder,
  REST,
  Routes
} = require("discord.js");

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

// ================= COMANDOS =================
const commands = [

  new SlashCommandBuilder()
    .setName("fila")
    .setDescription("Criar fila pública")
    .addStringOption(option =>
      option.setName("modo")
        .setDescription("Modo do treino")
        .setRequired(true)
        .addChoices(
          { name: "1x1", value: "1x1" },
          { name: "2x2", value: "2x2" },
          { name: "3x3", value: "3x3" },
          { name: "4x4", value: "4x4" },
          { name: "Misto Tático", value: "misto" },
          { name: "Full Soco", value: "fullsoco" }
        )
    ),

  new SlashCommandBuilder()
    .setName("fila_treino")
    .setDescription("Criar treino privado")
    .addStringOption(option =>
      option.setName("modo")
        .setDescription("Modo do treino")
        .setRequired(true)
        .addChoices(
          { name: "1x1", value: "1x1" },
          { name: "2x2", value: "2x2" },
          { name: "3x3", value: "3x3" },
          { name: "4x4", value: "4x4" },
          { name: "Misto Tático", value: "misto" },
          { name: "Full Soco", value: "fullsoco" }
        )
    )

].map(cmd => cmd.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);

client.once("ready", async () => {
  console.log(`🤖 Online como ${client.user.tag}`);

  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );

  console.log("✅ Comandos registrados.");
});

// ================= INTERAÇÕES =================
client.on("interactionCreate", async interaction => {

  if (!interaction.inGuild()) return;

  // ================= FILA PÚBLICA =================
  if (interaction.isChatInputCommand() && interaction.commandName === "fila") {
    criarFila(interaction, false);
  }

  // ================= FILA PRIVADA =================
  if (interaction.isChatInputCommand() && interaction.commandName === "fila_treino") {
    criarFila(interaction, true);
  }

  // ================= BOTÃO ENCERRAR =================
  if (interaction.isButton() && interaction.customId === "encerrar_treino
