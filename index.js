require("dotenv").config();
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

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

let fila = [];
const nomeFila = "rush";
const maxJogadores = 5;

/* ================= REGISTRAR COMANDO ================= */

const commands = [
  new SlashCommandBuilder()
    .setName("criarfila")
    .setDescription("Criar fila rush automaticamente")
].map(command => command.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);

client.once("ready", async () => {
  try {
    await rest.put(
      Routes.applicationCommands(CLIENT_ID),
      { body: commands }
    );
    console.log("Comando registrado!");
  } catch (error) {
    console.error(error);
  }

  console.log(`Bot online como ${client.user.tag}`);
});

/* ================= INTERAÇÕES ================= */

client.on("interactionCreate", async interaction => {

  /* ===== CRIAR FILA ===== */
  if (interaction.isChatInputCommand()) {

    if (interaction.commandName === "criarfila") {

      fila = [];

      const embed = new EmbedBuilder()
        .setTitle(`🎮 Fila ${nomeFila}`)
        .setDescription(`👥 Jogadores (0/${maxJogadores}):\nNenhum ainda`)
        .setColor("Blue");

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("entrar")
          .setLabel("Entrar")
          .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
          .setCustomId("sair")
          .setLabel("Sair")
          .setStyle(ButtonStyle.Danger)
      );

      await interaction.reply({
        embeds: [embed],
        components: [row]
      });
    }
  }

  /* ===== BOTÕES ===== */
  if (interaction.isButton()) {

    if (interaction.customId === "entrar") {

      if (fila.includes(interaction.user.id)) {
        return interaction.reply({
          content: "Você já está na fila!",
          ephemeral: true
        });
      }

      if (fila.length >= maxJogadores) {
        return interaction.reply({
          content: "A fila já está cheia!",
          ephemeral: true
        });
      }

      fila.push(interaction.user.id);

      atualizarPainel(interaction);
    }

    if (interaction.customId === "sair") {

      if (!fila.includes(interaction.user.id)) {
        return interaction.reply({
          content: "Você não está na fila!",
          ephemeral: true
        });
      }

      fila = fila.filter(id => id !== interaction.user.id);

      atualizarPainel(interaction);
    }
  }

});

/* ================= FUNÇÃO ATUALIZAR ================= */

async function atualizarPainel(interaction) {

  const nomes = fila.length > 0
    ? fila.map(id => `<@${id}>`).join("\n")
    : "Nenhum ainda";

  const embed = new EmbedBuilder()
    .setTitle(`🎮 Fila ${nomeFila}`)
    .setDescription(`👥 Jogadores (${fila.length}/${maxJogadores}):\n${nomes}`)
    .setColor("Blue");

  await interaction.update({
    embeds: [embed]
  });
}

/* ================= LOGIN ================= */

client.login(TOKEN);
