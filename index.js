// ===== PROTEÇÃO CONTRA ERROS =====
process.on("unhandledRejection", (reason, promise) => {
  console.log("Erro não tratado:", reason);
});

process.on("uncaughtException", (error) => {
  console.log("Erro inesperado:", error);
});

// ===== IMPORTAÇÕES =====
const { Client, GatewayIntentBits } = require("discord.js");
const express = require("express");

// ===== SERVIDOR WEB (ANTI SLEEP) =====
const app = express();
const PORT = process.env.PORT || 10000;

app.get("/", (req, res) => {
  res.status(200).send("OK");
});

app.listen(PORT, () => {
  console.log("Servidor web rodando na porta " + PORT);
});

// ===== BOT DISCORD =====
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.once("ready", () => {
  console.log("Bot online como " + client.user.tag);

  // Status do bot
  client.user.setActivity("Estou online 24h 😎");
});

// Slash command
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "teste") {
    await interaction.reply("Está funcionando perfeitamente 🚀");
  }
});

// Login
client.login(process.env.TOKEN);
