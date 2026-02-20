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
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers // IMPORTANTE
  ]
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
    console.error("Erro ao registrar comandos:", error);
  }
});

// =============================
// INTERAÇÕES
// =============================
client.on("interactionCreate", async interaction => {

  if (!interaction.inGuild()) return;

  // ===== /fila =====
  if (interaction.isChatInputCommand() && interaction.commandName === "fila") {
    await interaction.reply({
      content: "✅ Comando /fila funcionando normalmente.",
      ephemeral: true
    });
  }

  // ===== /fila_treino =====
  if (interaction.isChatInputCommand() && interaction.commandName === "fila_treino") {

    try {

      const modo = interaction.options.getString("modo");

      // VERIFICA PERMISSÃO
      if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
        return interaction.reply({
          content: "❌ Eu preciso da permissão **Gerenciar Canais**.",
          ephemeral: true
        });
      }

      const categoria = await interaction.guild.channels.create({
        name: `🎮 Treino ${modo}`,
        type: ChannelType.GuildCategory
      });

      const canal = await interaction.guild.channels.create({
        name: `🎮 partida-${modo}`,
        type: ChannelType.GuildText,
        parent: categoria.id
      });

      // PERMISSÕES DEPOIS DE CRIAR
      await categoria.permissionOverwrites.set([
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
      ]);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("encerrar_treino")
          .setLabel("Encerrar Treino")
          .setStyle(ButtonStyle.Danger)
      );

      await canal.send({
        content: `🎮 Treino ${modo} iniciado!

Terminando o treino clique no botão abaixo.`,
        components: [row]
      });

      await interaction.reply({
        content: `✅ Treino ${modo} criado com sucesso.`,
        ephemeral: true
      });

    } catch (error) {
      console.error("Erro ao criar treino:", error);

      if (!interaction.replied) {
        await interaction.reply({
          content: "❌ Deu erro ao criar o treino. Veja o console.",
          ephemeral: true
        });
      }
    }
  }

  // ===== BOTÃO ENCERRAR =====
  if (interaction.isButton() && interaction.customId === "encerrar_treino") {

    try {

      const isMediador = interaction.member.roles.cache.some(
        r => r.name.toLowerCase() === "mediador"
      );

      const isCriador = interaction.channel.parent.permissionOverwrites.cache.has(interaction.user.id);

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

    } catch (error) {
      console.error("Erro ao encerrar treino:", error);
    }
  }

});

client.login(TOKEN);
