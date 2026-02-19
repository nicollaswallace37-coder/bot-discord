require("dotenv").config();
const http = require("http");

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
  StringSelectMenuBuilder,
  ChannelType,
  PermissionFlagsBits
} = require("discord.js");

/* ================= SERVIDOR WEB (Render Fix) ================= */

http.createServer((req, res) => {
  res.writeHead(200);
  res.end("Bot online.");
}).listen(process.env.PORT || 3000);

/* ================= CLIENT ================= */

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

/* ================= CONFIG ================= */

const OWNER_ID = "1473169041890742347";

const PRECOS = [
  "0.20","2.50","5.00","10.00","15.00"
];

const modos = {
  "1x1": 2,
  "2x2": 4,
  "3x3": 6,
  "4x4": 8
};

let filas = {};

/* ================= COMANDO ================= */

const commands = [
  new SlashCommandBuilder()
    .setName("painel")
    .setDescription("Criar painel de fila")
].map(c => c.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);

client.once("ready", async () => {
  await rest.put(
    Routes.applicationCommands(CLIENT_ID),
    { body: commands }
  );
  console.log("Bot online!");
});

/* ================= INTERAÇÕES ================= */

client.on("interactionCreate", async interaction => {

  if (interaction.isChatInputCommand()) {

    if (interaction.user.id !== OWNER_ID) {
      return interaction.reply({
        content: "Você não pode usar esse comando.",
        ephemeral: true
      });
    }

    const selectModo = new StringSelectMenuBuilder()
      .setCustomId("select_modo")
      .setPlaceholder("Escolha o modo")
      .addOptions(
        Object.keys(modos).map(m => ({
          label: m,
          value: m
        }))
      );

    await interaction.reply({
      content: "Selecione o modo:",
      components: [new ActionRowBuilder().addComponents(selectModo)]
    });
  }

  if (interaction.isStringSelectMenu()) {

    if (interaction.customId === "select_modo") {

      const modo = interaction.values[0];

      const selectTipo = new StringSelectMenuBuilder()
        .setCustomId(`select_tipo_${modo}`)
        .setPlaceholder("Escolha o tipo")
        .addOptions(
          ["mobile","meu","misto","tático","full soco"]
          .map(t => ({ label: t, value: t }))
        );

      return interaction.update({
        content: `Modo: ${modo}\nEscolha o tipo:`,
        components: [new ActionRowBuilder().addComponents(selectTipo)]
      });
    }

    if (interaction.customId.startsWith("select_tipo_")) {

      const modo = interaction.customId.split("_")[2];
      const tipo = interaction.values[0];

      const selectPreco = new StringSelectMenuBuilder()
        .setCustomId(`select_preco_${modo}_${tipo}`)
        .setPlaceholder("Escolha o preço")
        .addOptions(
          PRECOS.map(p => ({
            label: `R$ ${p}`,
            value: p
          }))
        );

      return interaction.update({
        content: `Modo: ${modo}\nTipo: ${tipo}\nEscolha o preço:`,
        components: [new ActionRowBuilder().addComponents(selectPreco)]
      });
    }

    if (interaction.customId.startsWith("select_preco_")) {

      const parts = interaction.customId.split("_");
      const modo = parts[2];
      const tipo = parts[3];
      const preco = interaction.values[0];

      const key = `${modo}-${tipo}-${preco}`;

      filas[key] = {
        jogadores: [],
        modo,
        tipo,
        preco
      };

      return interaction.update({
        content: null,
        embeds: [criarEmbed(key)],
        components: [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`entrar_${key}`)
              .setLabel("Entrar")
              .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
              .setCustomId(`sair_${key}`)
              .setLabel("Sair")
              .setStyle(ButtonStyle.Danger)
          )
        ]
      });
    }
  }

  if (interaction.isButton()) {

    if (interaction.customId === "encerrar_partida") {
      return interaction.channel.delete();
    }

    const [acao, ...resto] = interaction.customId.split("_");
    const key = resto.join("_");

    if (!filas[key]) return;

    const fila = filas[key];
    const max = modos[fila.modo];

    if (acao === "entrar") {

      if (fila.jogadores.includes(interaction.user.id))
        return interaction.reply({ content: "Já está na fila.", ephemeral: true });

      if (fila.jogadores.length >= max)
        return interaction.reply({ content: "Fila cheia.", ephemeral: true });

      fila.jogadores.push(interaction.user.id);

      await interaction.update({
        embeds: [criarEmbed(key)],
        components: interaction.message.components
      });

      if (fila.jogadores.length === max) {
        await criarPartida(interaction.guild, fila);
        fila.jogadores = [];
      }
    }

    if (acao === "sair") {
      fila.jogadores = fila.jogadores.filter(id => id !== interaction.user.id);

      await interaction.update({
        embeds: [criarEmbed(key)],
        components: interaction.message.components
      });
    }
  }

});

/* ================= FUNÇÕES ================= */

function criarEmbed(key) {
  const fila = filas[key];

  const nomes = fila.jogadores.length
    ? fila.jogadores.map(id => `<@${id}>`).join("\n")
    : "Sem jogadores...";

  return new EmbedBuilder()
    .setTitle(`${fila.modo} | Fila`)
    .setDescription(
      `⚔️ Tipo: ${fila.tipo}\n💰 Preço: R$ ${fila.preco}\n\n👥 Jogadores:\n${nomes}`
    )
    .setColor("Blue");
}

async function criarPartida(guild, fila) {

  const categoria = guild.channels.cache.find(
    c => c.type === ChannelType.GuildCategory && c.name === "rush"
  );

  const mediador = guild.roles.cache.find(r => r.name === "Mediador");

  const permissionOverwrites = [
    {
      id: guild.roles.everyone.id,
      deny: [PermissionFlagsBits.ViewChannel]
    }
  ];

  fila.jogadores.forEach(id => {
    permissionOverwrites.push({
      id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
    });
  });

  if (mediador) {
    permissionOverwrites.push({
      id: mediador.id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
    });
  }

  const canal = await guild.channels.create({
    name: `rush-${fila.modo}-${Date.now()}`,
    type: ChannelType.GuildText,
    parent: categoria?.id,
    permissionOverwrites
  });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("encerrar_partida")
      .setLabel("Encerrar Partida")
      .setStyle(ButtonStyle.Danger)
  );

  await canal.send({
    content: `🎮 ${fila.modo} | ${fila.tipo}\n💰 R$ ${fila.preco}`,
    components: [row]
  });
}

/* ================= LOGIN ================= */

client.login(TOKEN);
