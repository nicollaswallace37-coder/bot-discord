const {
  Client,
  GatewayIntentBits,
  Events,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  REST,
  Routes,
  SlashCommandBuilder
} = require("discord.js");

require("dotenv").config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID; // ID do bot
const GUILD_ID = process.env.GUILD_ID;   // ID do servidor

// ===== REGISTRAR COMANDO =====
const commands = [
  new SlashCommandBuilder()
    .setName("criarfila")
    .setDescription("Cria o painel de fila")
].map(command => command.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  try {
    console.log("Registrando comando...");

    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );

    console.log("Comando registrado com sucesso!");
  } catch (error) {
    console.error(error);
  }
})();

// ===== BOT ONLINE =====
client.once(Events.ClientReady, () => {
  console.log(Bot ligado como ${client.user.tag});
});

// ===== INTERAÇÃO =====
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "criarfila") {

    const embed = new EmbedBuilder()
      .setTitle("📋 Sistema de Fila")
      .setDescription("Clique no botão abaixo para entrar na fila.")
      .setColor(0x2b2d31);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("entrar_fila")
        .setLabel("Entrar na Fila")
        .setStyle(ButtonStyle.Primary)
    );

    await interaction.reply({
      embeds: [embed],
      components: [row]
    });
  }
});

client.login(TOKEN);
