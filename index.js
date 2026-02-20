require("dotenv").config();

const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Bot online ✅");
});

app.listen(PORT, () => {
  console.log("🌐 Servidor rodando na porta", PORT);
});

const {
  Client,
  GatewayIntentBits,
  ChannelType,
  PermissionsBitField,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  SlashCommandBuilder,
  REST,
  Routes
} = require("discord.js");

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

// ===================== COMANDOS =====================
const commands = [

  // 🔹 FILA PÚBLICA (igual antes)
  new SlashCommandBuilder()
    .setName("fila")
    .setDescription("Criar fila pública"),

  // 🔹 FILA PRIVADA
  new SlashCommandBuilder()
    .setName("fila_treino")
    .setDescription("Criar treino privado")
    .addStringOption(option =>
      option.setName("modo")
        .setDescription("Modo do treino")
        .setRequired(true)
        .addChoices(
          { name: "1x1", value: "1x1" },
          { name: "2x2", value: "2x2" },
          { name: "3x3", value: "3x3" },
          { name: "4x4", value: "4x4" },
          { name: "Misto Tático", value: "misto" },
          { name: "Full Soco", value: "fullsoco" }
        )
    )

].map(cmd => cmd.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);

client.once("ready", async () => {
  console.log(`🤖 Online como ${client.user.tag}`);

  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );

  console.log("✅ Comandos registrados.");
});

// ===================== INTERAÇÕES =====================
client.on("interactionCreate", async interaction => {

  if (!interaction.inGuild()) return;

  // ================= FILA PÚBLICA =================
  if (interaction.isChatInputCommand() && interaction.commandName === "fila") {
    return interaction.reply({
      content: "📢 Fila criada! Aguardando jogadores...",
      ephemeral: false
    });
  }

  // ================= FILA PRIVADA =================
  if (interaction.isChatInputCommand() && interaction.commandName === "fila_treino") {

    try {

      const modo = interaction.options.getString("modo");

      if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
        return interaction.reply({
          content: "❌ Preciso da permissão Gerenciar Canais.",
          ephemeral: true
        });
      }

      // 🔒 Categoria privada
      const categoria = await interaction.guild.channels.create({
        name: `🎮 Treino ${modo}`,
        type: ChannelType.GuildCategory,
        permissionOverwrites: [
          {
            id: interaction.guild.roles.everyone.id,
            deny: [PermissionsBitField.Flags.ViewChannel]
          },
          {
            id: interaction.guild.members.me.id,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages,
              PermissionsBitField.Flags.ManageChannels
            ]
          },
          {
            id: interaction.user.id,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages
            ]
          }
        ]
      });

      const canal = await interaction.guild.channels.create({
        name: `🎮 partida-${modo}`,
        type: ChannelType.GuildText,
        parent: categoria.id
      });

      await canal.setTopic(`criador:${interaction.user.id}`);

      const jogadores = [];

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("entrar_privado")
          .setLabel("Entrar")
          .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
          .setCustomId("sair_privado")
          .setLabel("Sair")
          .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
          .setCustomId("encerrar_treino")
          .setLabel("Encerrar")
          .setStyle(ButtonStyle.Danger)
      );

      await canal.send({
        content: `🎮 **Treino ${modo} iniciado!**

Jogadores:
Nenhum ainda.

Terminando o treino clique em Encerrar.
Bom treino 💪`,
        components: [row]
      });

      await interaction.reply({
        content: `✅ Treino ${modo} criado.`,
        ephemeral: true
      });

    } catch (error) {
      console.error("Erro ao criar treino:", error);
    }
  }

  // ================= BOTÕES =================
  if (interaction.isButton()) {

    const canal = interaction.channel;
    const categoria = canal.parent;

    // 🔹 ENTRAR
    if (interaction.customId === "entrar_privado") {

      await canal.permissionOverwrites.edit(interaction.user.id, {
        ViewChannel: true,
        SendMessages: true
      });

      await interaction.reply({
        content: "✅ Você entrou no treino.",
        ephemeral: true
      });
    }

    // 🔹 SAIR
    if (interaction.customId === "sair_privado") {

      await canal.permissionOverwrites.delete(interaction.user.id)
        .catch(() => {});

      await interaction.reply({
        content: "❌ Você saiu do treino.",
        ephemeral: true
      });
    }

    // 🔹 ENCERRAR
    if (interaction.customId === "encerrar_treino") {

      const isMediador = interaction.member.roles.cache.some(
        r => r.name.toLowerCase() === "mediador"
      );

      const criadorId = canal.topic?.replace("criador:", "");
      const isCriador = criadorId === interaction.user.id;

      if (isMediador || isCriador) {

        await canal.delete().catch(() => {});

        if (categoria && categoria.children.cache.size === 0) {
          await categoria.delete().catch(() => {});
        }

      } else {
        await interaction.reply({
          content: "❌ Você não pode encerrar esse treino.",
          ephemeral: true
        });
      }
    }
  }

});

client.login(TOKEN);
