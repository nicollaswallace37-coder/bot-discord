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
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits
} = require("discord.js");

/* ================= CONFIG ================= */

const TOKEN = process.env.TOKEN;
const CLIENT_ID = "1473102205115564112";
const GUILD_ID = "1473169041890742347";
const OWNER_ID = "1467036179386990593";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

/* ================= COMANDO ================= */

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
    console.log("Comando registrado!");
  } catch (err) {
    console.error(err);
  }

  console.log(`Bot online como ${client.user.tag}`);
});

/* ================= INTERAÇÕES ================= */

client.on("interactionCreate", async interaction => {

  /* ===== BLOQUEIO APENAS DONO ===== */
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
        .setDescription("Selecione as opções da fila usando os botões abaixo.")
        .setColor("Blue");

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("modo")
          .setLabel("Selecionar Modo")
          .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
          .setCustomId("tipo")
          .setLabel("Selecionar Tipo")
          .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
          .setCustomId("preco")
          .setLabel("Selecionar Preço")
          .setStyle(ButtonStyle.Success)
      );

      await interaction.reply({
        embeds: [embed],
        components: [row]
      });
    }
  }

  /* ===== BOTÕES ===== */

  if (interaction.isButton()) {

    if (interaction.customId === "modo") {
      return interaction.reply({
        content: "Modos disponíveis:\n1x1\n2x2\n3x3\n4x4",
        ephemeral: true
      });
    }

    if (interaction.customId === "tipo") {
      return interaction.reply({
        content: "Tipos disponíveis:\nMobile\nMeu\nMisto\nTático\nFull soco",
        ephemeral: true
      });
    }

    if (interaction.customId === "preco") {
      return interaction.reply({
        content: "Você poderá configurar até 15 preços diferentes (ex: 0,20 / 5,00 / 10,50)",
        ephemeral: true
      });
    }
  }

});

/* ================= LOGIN ================= */

client.login(TOKEN);
