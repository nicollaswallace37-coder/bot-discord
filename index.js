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

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

let fila = [];

// ===== Registrar comando =====
const commands = [
  new SlashCommandBuilder()
    .setName("criarfila")
    .setDescription("Cria o painel da fila")
    .toJSON()
];

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  try {
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );
    console.log("Comando registrado com sucesso!");
  } catch (error) {
    console.error(error);
  }
})();

// ===== Quando o bot ligar =====
client.once("ready", () => {
  console.log(Bot ligado como ${client.user.tag});
});

// ===== Interações =====
client.on(Events.InteractionCreate, async (interaction) => {

  // Slash command
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === "criarfila") {

      fila = [];

      const embed = new EmbedBuilder()
        .setTitle("📋 Sistema de Fila")
        .setDescription("Ninguém na fila ainda.")
        .setColor(0x2b2d31);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("entrar_fila")
          .setLabel("Entrar na Fila")
          .setStyle(ButtonStyle.Success)
      );

      await interaction.reply({
        embeds: [embed],
        components: [row]
      });
    }
  }

  // Botão
  if (interaction.isButton()) {

    if (interaction.customId === "entrar_fila") {

      if (!fila.includes(interaction.user.id)) {
        fila.push(interaction.user.id);
      }

      const lista = fila.length > 0
        ? fila.map((id, index) => ${index + 1}. <@${id}>).join("\n")
        : "Ninguém na fila ainda.";

      const embedAtualizado = new EmbedBuilder()
        .setTitle("📋 Sistema de Fila")
        .setDescription(lista)
        .setColor(0x2b2d31);

      await interaction.update({
        embeds: [embedAtualizado]
      });
    }
  }

});

client.login(TOKEN);
