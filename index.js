require("dotenv").config();
const http = require("http");

const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  Routes,
  REST,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

/* ================== CONFIG ================== */

const TOKEN = process.env.TOKEN;
const CLIENT_ID = "1473102205115564112";
const GUILD_ID = "1473169041890742347";
const OWNER_ID = "1467036179386990593";

/* ================== SERVIDOR WEB (RENDER FIX) ================== */

const PORT = process.env.PORT || 3000;

http.createServer((req, res) => {
  res.writeHead(200);
  res.end("Bot online.");
}).listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor web rodando na porta ${PORT}`);
});

/* ================== CLIENT ================== */

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

/* ================== COMANDO ================== */

const commands = [
  new SlashCommandBuilder()
    .setName("painel")
    .setDescription("Criar painel de configuração da fila")
].map(cmd => cmd.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);

client.once("ready", async () => {
  try {
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );
    console.log("Comando /painel registrado com sucesso!");
  } catch (err) {
    console.error("Erro ao registrar comando:", err);
  }

  console.log(`Bot online como ${client.user.tag}`);
});

/* ================== INTERAÇÕES ================== */

client.on("interactionCreate", async interaction => {

  if (interaction.isChatInputCommand()) {

    if (interaction.user.id !== OWNER_ID) {
      return interaction.reply({
        content: "Você não pode usar esse comando.",
        ephemeral: true
      });
    }

    if (interaction.commandName === "painel") {

      const embed = new EmbedBuilder()
        .setTitle("🎮 Painel de Configuração")
        .setDescription("Sistema de filas iniciado com sucesso.")
        .setColor("Blue");

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("info")
          .setLabel("Configurar Fila")
          .setStyle(ButtonStyle.Primary)
      );

      await interaction.reply({
        embeds: [embed],
        components: [row]
      });
    }
  }

  if (interaction.isButton()) {

    if (interaction.customId === "info") {
      return interaction.reply({
        content: "Sistema pronto para expandir (modo, tipo, preço, filas automáticas).",
        ephemeral: true
      });
    }

  }

});

/* ================== LOGIN ================== */

client.login(TOKEN);
