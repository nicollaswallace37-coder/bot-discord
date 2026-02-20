require("dotenv").config();
const express = require("express");
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionsBitField,
  REST,
  Routes,
  SlashCommandBuilder
} = require("discord.js");

/* ================= SERVIDOR ================= */

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Bot online ✅");
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("🌐 Servidor rodando na porta:", PORT);
});

/* ================= CLIENT ================= */

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

const filas = {};

const modos = {
  "1x1": 2,
  "2x2": 4,
  "3x3": 6,
  "4x4": 8
};

const precos = {
  "1x1": 10,
  "2x2": 20,
  "3x3": 30,
  "4x4": 40
};

/* ================= REGISTRAR COMANDOS ================= */

async function registrarComandos() {

  const modosChoices = [
    { name: "1x1", value: "1x1" },
    { name: "2x2", value: "2x2" },
    { name: "3x3", value: "3x3" },
    { name: "4x4", value: "4x4" }
  ];

  const tiposChoices = [
    { name: "Mobile", value: "Mobile" },
    { name: "Emulador", value: "Emulador" },
    { name: "Misto", value: "Misto" },
    { name: "Tático", value: "Tático" },
    { name: "Full Soco", value: "Full Soco" }
  ];

  const commands = [
    new SlashCommandBuilder()
      .setName("fila")
      .setDescription("Criar fila normal")
      .addStringOption(option =>
        option.setName("modo")
          .setDescription("Modo")
          .setRequired(true)
          .addChoices(...modosChoices))
      .addStringOption(option =>
        option.setName("tipo")
          .setDescription("Tipo")
          .setRequired(true)
          .addChoices(...tiposChoices)),

    new SlashCommandBuilder()
      .setName("fila_treino")
      .setDescription("Criar fila treino (SEM VALOR)")
      .addStringOption(option =>
        option.setName("modo")
          .setDescription("Modo")
          .setRequired(true)
          .addChoices(...modosChoices))
      .addStringOption(option =>
        option.setName("tipo")
          .setDescription("Tipo")
          .setRequired(true)
          .addChoices(...tiposChoices))
  ].map(cmd => cmd.toJSON());

  const rest = new REST({ version: "10" }).setToken(TOKEN);
  await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });

  console.log("✅ Comandos registrados!");
}

client.once("ready", async () => {
  console.log("🤖 Bot online!");
  await registrarComandos();
});

/* ================= INTERAÇÕES ================= */

client.on("interactionCreate", async interaction => {

  /* ================= SLASH ================= */

  if (interaction.isChatInputCommand()) {

    const modo = interaction.options.getString("modo");
    const tipo = interaction.options.getString("tipo");

    const id = `${interaction.commandName}_${Date.now()}`;
    const isTreino = interaction.commandName === "fila_treino";

    filas[id] = { modo, tipo, jogadores: [], treino: isTreino };

    const embed = new EmbedBuilder()
      .setTitle(isTreino ? `🔥 Fila Treino ${modo}` : `💰 Fila ${modo}`)
      .setDescription(
`Tipo: ${tipo}
${!isTreino ? `Valor: R$ ${precos[modo]}\n` : ""}
Jogadores (0/${modos[modo]})`
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`entrar_${id}`)
        .setLabel("Entrar")
        .setStyle(ButtonStyle.Success)
    );

    return interaction.reply({ embeds: [embed], components: [row] });
  }

  /* ================= ENTRAR ================= */

  if (interaction.isButton() && interaction.customId.startsWith("entrar_")) {

    const id = interaction.customId.replace("entrar_", "");
    const fila = filas[id];
    if (!fila) return;

    if (fila.jogadores.includes(interaction.user.id))
      return interaction.reply({ content: "Você já entrou!", ephemeral: true });

    fila.jogadores.push(interaction.user.id);

    const max = modos[fila.modo];

    const embed = new EmbedBuilder()
      .setTitle(fila.treino ? `🔥 Fila Treino ${fila.modo}` : `💰 Fila ${fila.modo}`)
      .setDescription(
`Tipo: ${fila.tipo}
${!fila.treino ? `Valor: R$ ${precos[fila.modo]}\n` : ""}
Jogadores (${fila.jogadores.length}/${max})
${fila.jogadores.map(id => `<@${id}>`).join("\n")}`
      );

    await interaction.update({ embeds: [embed] });

    if (fila.jogadores.length < max) return;

    /* ================= NOVA FILA AUTOMÁTICA ================= */

    const novaEmbed = EmbedBuilder.from(embed)
      .setDescription(
`Tipo: ${fila.tipo}
${!fila.treino ? `Valor: R$ ${precos[fila.modo]}\n` : ""}
Jogadores (0/${max})`
      );

    fila.jogadores = [];

    await interaction.message.edit({ embeds: [novaEmbed] });

    /* ================= CRIAR CATEGORIA ================= */

    const nomeCategoria = fila.treino ? "rush treino" : "rush";

    let categoria = interaction.guild.channels.cache.find(
      c => c.type === ChannelType.GuildCategory &&
      c.name.toLowerCase() === nomeCategoria
    );

    if (!categoria) {
      categoria = await interaction.guild.channels.create({
        name: nomeCategoria,
        type: ChannelType.GuildCategory
      });
    }

    /* ================= CANAL PRIVADO ================= */

    const canal = await interaction.guild.channels.create({
      name: `partida-${fila.modo}`,
      type: ChannelType.GuildText,
      parent: categoria.id,
      permissionOverwrites: [
        {
          id: interaction.guild.roles.everyone,
          deny: [PermissionsBitField.Flags.ViewChannel]
        },
        ...interaction.message.embeds[0].description
      ]
    });

    const encerrarRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("encerrar_treino")
        .setLabel("Encerrar Treino")
        .setStyle(ButtonStyle.Danger)
    );

    await canal.send({
      content: "🔥 Treino iniciado!\n\nPor favor, terminando o treino clique no botão **Encerrar Treino**.\nBom treino 💪",
      components: fila.treino ? [encerrarRow] : []
    });
  }

  /* ================= ENCERRAR ================= */

  if (interaction.isButton() && interaction.customId === "encerrar_treino") {
    await interaction.channel.delete();
  }

});

client.login(TOKEN);
