require("dotenv").config();

const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;

// ===== SERVIDOR PARA RENDER =====
app.get("/", (req, res) => {
  res.send("Bot online ✅");
});

app.listen(PORT, () => {
  console.log("🌐 Servidor rodando na porta", PORT);
});

// ===== DISCORD =====
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
  intents: [GatewayIntentBits.Guilds]
});

// =============================
// REGISTRAR COMANDOS
// =============================
const commands = [

  new SlashCommandBuilder()
    .setName("fila")
    .setDescription("Comando principal da fila"),

  new SlashCommandBuilder()
    .setName("fila_treino")
    .setDescription("Criar treino")
    .addStringOption(option =>
      option.setName("modo")
        .setDescription("Escolha o modo")
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

  try {
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );
    console.log("✅ Comandos registrados.");
  } catch (error) {
    console.error(error);
  }
});

// =============================
// INTERAÇÕES
// =============================
client.on("interactionCreate", async interaction => {

  // ===== /fila =====
  if (interaction.isChatInputCommand() && interaction.commandName === "fila") {

    await interaction.reply({
      content: "✅ Comando /fila funcionando normalmente.",
      ephemeral: true
    });
  }

  // ===== /fila_treino =====
  if (interaction.isChatInputCommand() && interaction.commandName === "fila_treino") {

    const modo = interaction.options.getString("modo");

    const permissionOverwrites = [
      {
        id: interaction.guild.roles.everyone,
        deny: [PermissionsBitField.Flags.ViewChannel]
      },
      {
        id: interaction.user.id,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages
        ]
      }
    ];

    const categoria = await interaction.guild.channels.create({
      name: `Treino ${modo}`,
      type: ChannelType.GuildCategory,
      permissionOverwrites
    });

    const canal = await interaction.guild.channels.create({
      name: `partida-${modo}`,
      type: ChannelType.GuildText,
      parent: categoria.id
    });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("encerrar_treino")
        .setLabel("Encerrar Treino")
        .setStyle(ButtonStyle.Danger)
    );

    await canal.send({
      content: `🎮 Treino ${modo} iniciado!

Por favor terminando o treino clica no botão encerrar treino, bom treino.`,
      components: [row]
    });

    await interaction.reply({
      content: `✅ Treino ${modo} criado.`,
      ephemeral: true
    });
  }

  // ===== BOTÃO ENCERRAR =====
  if (interaction.isButton() && interaction.customId === "encerrar_treino") {

    const isMediador = interaction.member.roles.cache.some(
      r => r.name.toLowerCase() === "mediador"
    );

    const isCriador = interaction.channel.permissionOverwrites.cache.has(interaction.user.id);

    if (isMediador || isCriador) {

      const categoria = interaction.channel.parent;

      await interaction.channel.delete().catch(() => {});

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

});

client.login(TOKEN);
