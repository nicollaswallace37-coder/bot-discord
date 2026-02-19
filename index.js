require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionsBitField
} = require("discord.js");

const express = require("express");
const app = express();

const PORT = process.env.PORT || 10000;

app.get("/", (req, res) => {
  res.send("Bot online 🚀");
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🌍 Servidor rodando na porta ${PORT}`);
});

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.Channel]
});

const filas = new Map();

client.once("ready", () => {
  console.log(`✅ Bot online como ${client.user.tag}`);
});

client.on("interactionCreate", async (interaction) => {

  // ================= CRIAR FILA =================
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === "criarfila") {

      await interaction.deferReply(); // 🔥 evita erro dos 3 segundos

      const nomeFila = interaction.options.getString("nome");
      const maxJogadores = interaction.options.getInteger("max");

      filas.set(nomeFila, {
        jogadores: [],
        max: maxJogadores
      });

      const embed = new EmbedBuilder()
        .setTitle(`🎮 Fila: ${nomeFila}`)
        .setDescription(`👥 Jogadores:\nNenhum ainda`)
        .setColor("Green");

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`entrar_${nomeFila}`)
          .setLabel("Entrar")
          .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
          .setCustomId(`sair_${nomeFila}`)
          .setLabel("Sair")
          .setStyle(ButtonStyle.Danger)
      );

      await interaction.editReply({
        embeds: [embed],
        components: [row]
      });
    }
  }

  // ================= BOTÕES =================
  if (interaction.isButton()) {

    const [acao, nomeFila] = interaction.customId.split("_");
    const fila = filas.get(nomeFila);

    if (!fila)
      return interaction.reply({ content: "Fila não encontrada.", ephemeral: true });

    // ===== ENTRAR =====
    if (acao === "entrar") {

      if (fila.jogadores.includes(interaction.user.id))
        return interaction.reply({ content: "Você já está na fila.", ephemeral: true });

      if (fila.jogadores.length >= fila.max)
        return interaction.reply({ content: "Fila já está cheia.", ephemeral: true });

      fila.jogadores.push(interaction.user.id);

      await atualizarMensagem(interaction, nomeFila);

      await interaction.reply({ content: "Você entrou na fila!", ephemeral: true });

      if (fila.jogadores.length === fila.max) {
        await criarSalaPrivada(interaction.guild, nomeFila, fila.jogadores);
        fila.jogadores = [];
      }
    }

    // ===== SAIR =====
    if (acao === "sair") {

      fila.jogadores = fila.jogadores.filter(id => id !== interaction.user.id);

      await atualizarMensagem(interaction, nomeFila);

      await interaction.reply({ content: "Você saiu da fila.", ephemeral: true });
    }

    // ===== ENCERRAR SALA =====
    if (acao === "encerrar") {

      if (!interaction.member.roles.cache.some(r => r.name === "Mediador"))
        return interaction.reply({ content: "Você não é mediador.", ephemeral: true });

      await interaction.channel.delete();
    }
  }
});

// ================= ATUALIZAR EMBED =================
async function atualizarMensagem(interaction, nomeFila) {

  const fila = filas.get(nomeFila);

  const lista =
    fila.jogadores.length > 0
      ? fila.jogadores.map(id => `<@${id}>`).join("\n")
      : "Nenhum ainda";

  const embed = new EmbedBuilder()
    .setTitle(`🎮 Fila: ${nomeFila}`)
    .setDescription(`👥 Jogadores:\n${lista}`)
    .setColor("Green");

  await interaction.message.edit({ embeds: [embed] });
}

// ================= CRIAR SALA PRIVADA =================
async function criarSalaPrivada(guild, nomeFila, jogadores) {

  const mediadorRole = guild.roles.cache.find(r => r.name === "Mediador");

  const channel = await guild.channels.create({
    name: `sala-${nomeFila}`,
    type: ChannelType.GuildText,
    permissionOverwrites: [
      {
        id: guild.roles.everyone,
        deny: [PermissionsBitField.Flags.ViewChannel]
      },
      ...jogadores.map(id => ({
        id: id,
        allow: [PermissionsBitField.Flags.ViewChannel]
      })),
      mediadorRole && {
        id: mediadorRole.id,
        allow: [PermissionsBitField.Flags.ViewChannel]
      }
    ].filter(Boolean)
  });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("encerrar_sala")
      .setLabel("Encerrar Sala")
      .setStyle(ButtonStyle.Danger)
  );

  await channel.send({
    content: `Sala criada para: ${jogadores.map(id => `<@${id}>`).join(", ")}`,
    components: [row]
  });
}

client.login(process.env.TOKEN);
