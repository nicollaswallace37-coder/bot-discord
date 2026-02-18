process.on("unhandledRejection", console.error);
process.on("uncaughtException", console.error);

const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder
} = require("discord.js");

const express = require("express");
const app = express();
const PORT = process.env.PORT || 10000;

app.get("/", (req, res) => {
  res.status(200).send("OK");
});

app.listen(PORT, () => {
  console.log("Servidor web rodando");
});

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const commands = [
  new SlashCommandBuilder()
    .setName("fila")
    .setDescription("Criar painel de fila"),

  new SlashCommandBuilder()
    .setName("teste")
    .setDescription("Comando de teste")
].map(command => command.toJSON());

client.once("ready", async () => {
  console.log("Bot online como " + client.user.tag);

  const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

  const GUILD_ID = "1473169041890742347";

  try {
    console.log("Registrando comandos no servidor...");

    await rest.put(
      Routes.applicationGuildCommands(client.user.id, GUILD_ID),
      { body: commands }
    );

    console.log("Comandos registrados no servidor!");
  } catch (error) {
    console.error(error);
  }
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  await interaction.deferReply();

  if (interaction.commandName === "teste") {
    await interaction.editReply("Está funcionando 🚀");
  }

  if (interaction.commandName === "fila") {
    await interaction.editReply("Sistema de fila funcionando ✅");
  }
});

client.login(process.env.TOKEN);
