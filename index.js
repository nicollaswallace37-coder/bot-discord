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

// ===== SERVIDOR WEB (ANTI-SLEEP RENDER) =====
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
  client.user.setActivity("Estou online 24h 😎");
});

// ===== SLASH COMMAND =====
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "teste") {
    await interaction.deferReply(); // evita erro de não respondeu
    await interaction.editReply("Está funcionando perfeitamente 🚀");
  }
});

// ===== LOGIN =====
client.login(process.env.TOKEN);
