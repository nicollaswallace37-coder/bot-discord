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

const TOKEN = "SEU_TOKEN_AQUI";
const CLIENT_ID = "SEU_CLIENT_ID_AQUI";
const GUILD_ID = "SEU_GUILD_ID_AQUI";

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// =============================
// REGISTRAR COMANDO SLASH
// =============================
const commands = [
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
].map(command => command.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  try {
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );
    console.log("✅ Comando registrado.");
  } catch (error) {
    console.error(error);
  }
})();

// =============================
// BOT ONLINE
// =============================
client.once("ready", () => {
  console.log(`🤖 Online como ${client.user.tag}`);
});

// =============================
// INTERAÇÕES
// =============================
client.on("interactionCreate", async interaction => {

  // =============================
  // CRIAR FILA
  // =============================
  if (interaction.isChatInputCommand() && interaction.commandName === "fila_treino") {

    const modo = interaction.options.getString("modo");

    const jogadores = [interaction.user.id];

    // PERMISSÕES (categoria e canal)
    const permissionOverwrites = [
      {
        id: interaction.guild.roles.everyone,
        deny: [PermissionsBitField.Flags.ViewChannel]
      }
    ];

    jogadores.forEach(id => {
      permissionOverwrites.push({
        id,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages
        ]
      });
    });

    // CRIAR CATEGORIA COM PERMISSÕES
    const categoria = await interaction.guild.channels.create({
      name: `Treino ${modo}`,
      type: ChannelType.GuildCategory,
      permissionOverwrites
    });

    // CRIAR CANAL HERDANDO DA CATEGORIA
    const canal = await interaction.guild.channels.create({
      name: `partida-${modo}`,
      type: ChannelType.GuildText,
      parent: categoria.id
    });

    // BOTÃO ENCERRAR
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("encerrar_treino")
        .setLabel("Encerrar Treino")
        .setStyle(ButtonStyle.Danger)
    );

    await canal.send({
      content: `🎮 Treino ${modo} criado!\n\nClique abaixo para encerrar.`,
      components: [row]
    });

    await interaction.reply({
      content: `✅ Treino ${modo} criado com sucesso!`,
      ephemeral: true
    });
  }

  // =============================
  // ENCERRAR TREINO
  // =============================
  if (interaction.isButton() && interaction.customId === "encerrar_treino") {

    // Permitir se for jogador do canal ou Mediador
    const isMediador = interaction.member.roles.cache.some(r => r.name === "Mediador");

    if (isMediador || interaction.channel) {
      await interaction.channel.delete().catch(() => {});
    }
  }

});

client.login(TOKEN);
