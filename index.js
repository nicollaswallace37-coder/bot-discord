const { Client, GatewayIntentBits } = require("discord.js");
const express = require("express");

const app = express();
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

// 🔹 Servidor para o Render não derrubar
app.get("/", (req, res) => {
  res.send("Bot está online!");
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Servidor web iniciado");
});

// 🔹 Bot Discord
client.once("ready", () => {
  console.log("Bot online com sucesso!");
});

client.login(process.env.TOKEN);
