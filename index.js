const { Client, GatewayIntentBits } = require("discord.js");
const express = require("express");

const app = express();
const PORT = process.env.PORT;

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

app.get("/", (req, res) => {
  res.send("Bot está online!");
});

// ⚠️ IMPORTANTE: usar exatamente process.env.PORT
app.listen(PORT, () => {
  console.log("Servidor rodando na porta " + PORT);
});

client.once("ready", () => {
  console.log("Bot online com sucesso!");
});

client.login(process.env.TOKEN);
