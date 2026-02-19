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

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

let fila = [];
const nomeFila = "rush";
const maxJogadores = 4;

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

    /* ===== ENTRAR ===== */
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

      await atualizarPainel(interaction);
    }

    /* ===== SAIR ===== */
    if (interaction.customId === "sair") {

      if (!fila.includes(interaction.user.id)) {
        return interaction.reply({
          content: "Você não está na fila!",
          ephemeral: true
        });
      }

      fila = fila.filter(id => id !== interaction.user.id);

      await atualizarPainel(interaction);
    }

    /* ===== ENCERRAR ===== */
    if (interaction.customId === "encerrar") {

      const cargoMediador = interaction.guild.roles.cache.find(
        r => r.name === "Mediador"
      );

      if (!cargoMediador || !interaction.member.roles.cache.has(cargoMediador.id)) {
        return interaction.reply({
          content: "Apenas Mediadores podem encerrar.",
          ephemeral: true
        });
      }

      await interaction.channel.delete();
    }
  }

});

/* ================= ATUALIZAR PAINEL ================= */

async function atualizarPainel(interaction) {

  const guild = interaction.guild;

  const nomes = fila.length > 0
    ? fila.map(id => `<@${id}>`).join("\n")
    : "Nenhum ainda";

  const embed = new EmbedBuilder()
    .setTitle(`🎮 Fila ${nomeFila}`)
    .setDescription(`👥 Jogadores (${fila.length}/${maxJogadores}):\n${nomes}`)
    .setColor("Blue");

  /* ===== SE FECHAR A FILA ===== */
  if (fila.length === maxJogadores) {

    const categoria = guild.channels.cache.find(
      c => c.type === ChannelType.GuildCategory && c.name === "rush"
    );

    if (!categoria) {
      console.log("Categoria 'rush' não encontrada!");
    } else {

      const cargoMediador = guild.roles.cache.find(
        r => r.name === "Mediador"
      );

      const permissionOverwrites = [
        {
          id: guild.roles.everyone.id,
          deny: [PermissionFlagsBits.ViewChannel]
        }
      ];

      if (cargoMediador) {
        permissionOverwrites.push({
          id: cargoMediador.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages
          ]
        });
      }

      fila.forEach(id => {
        permissionOverwrites.push({
          id: id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages
          ]
        });
      });

      const canal = await guild.channels.create({
        name: `sala-${Date.now()}`,
        type: ChannelType.GuildText,
        parent: categoria.id,
        permissionOverwrites
      });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("encerrar")
          .setLabel("Encerrar Chat")
          .setStyle(ButtonStyle.Danger)
      );

      await canal.send({
        content: "Partida iniciada!",
        components: [row]
      });

      fila = [];
    }
  }

  await interaction.update({
    embeds: [embed]
  });
}

/* ================= LOGIN ================= */

client.login(TOKEN);
