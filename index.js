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

/* ================= CONFIG ================= */

const TOKEN = process.env.TOKEN;
const CLIENT_ID = "1473102205115564112";
const GUILD_ID = "1473169041890742347";
const OWNER_ID = "1467036179386990593";
const PORT = process.env.PORT || 3000;

/* ================= SERVIDOR WEB (RENDER FIX) ================= */

http.createServer((req, res) => {
  res.writeHead(200);
  res.end("Bot online.");
}).listen(PORT, "0.0.0.0");

/* ================= CLIENT ================= */

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

/* ================= DADOS ================= */

const modos = {
  "1x1": 2,
  "2x2": 4,
  "3x3": 6,
  "4x4": 8
};

const tipos = ["mobile","meu","misto","tático","full soco"];

const precos = [
  "0,20","2,50","5,00","10,00","15,00"
];

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
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );
  console.log("Bot online!");
});

/* ================= INTERAÇÕES ================= */

client.on("interactionCreate", async interaction => {

  /* ===== COMANDO /painel ===== */

  if (interaction.isChatInputCommand()) {

    if (interaction.user.id !== OWNER_ID)
      return interaction.reply({ content: "Você não pode usar.", ephemeral: true });

    const row1 = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("modo_select")
        .setPlaceholder("Escolha o modo")
        .addOptions(Object.keys(modos).map(m => ({
          label: m,
          value: m
        })))
    );

    return interaction.reply({
      content: "🎮 Selecione o modo:",
      components: [row1]
    });
  }

  /* ===== SELEÇÃO DE MODO ===== */

  if (interaction.isStringSelectMenu() && interaction.customId === "modo_select") {

    const modo = interaction.values[0];

    const row = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`tipo_select_${modo}`)
        .setPlaceholder("Escolha o tipo")
        .addOptions(tipos.map(t => ({
          label: t,
          value: t
        })))
    );

    return interaction.update({
      content: `Modo: ${modo}\nEscolha o tipo:`,
      components: [row]
    });
  }

  /* ===== SELEÇÃO DE TIPO ===== */

  if (interaction.isStringSelectMenu() && interaction.customId.startsWith("tipo_select_")) {

    const modo = interaction.customId.split("_")[2];
    const tipo = interaction.values[0];

    const row = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`preco_select_${modo}_${tipo}`)
        .setPlaceholder("Escolha o preço")
        .addOptions(precos.map(p => ({
          label: `R$ ${p}`,
          value: p
        })))
    );

    return interaction.update({
      content: `Modo: ${modo}\nTipo: ${tipo}\nEscolha o preço:`,
      components: [row]
    });
  }

  /* ===== SELEÇÃO DE PREÇO ===== */

  if (interaction.isStringSelectMenu() && interaction.customId.startsWith("preco_select_")) {

    const parts = interaction.customId.split("_");
    const modo = parts[2];
    const tipo = parts[3];
    const preco = interaction.values[0];

    const key = `${modo}-${tipo}-${preco}`;

    filas[key] = {
      modo,
      tipo,
      preco,
      jogadores: []
    };

    const embed = new EmbedBuilder()
      .setTitle(`Fila ${modo}`)
      .setDescription(`⚔ Tipo: ${tipo}\n💰 Preço: R$ ${preco}\n\n👥 Jogadores:\nNenhum`)
      .setColor("Blue");

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`entrar_${key}`)
        .setLabel("Entrar")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`sair_${key}`)
        .setLabel("Sair")
        .setStyle(ButtonStyle.Danger)
    );

    return interaction.update({
      content: "Fila criada!",
      embeds: [embed],
      components: [row]
    });
  }

  /* ===== BOTÕES ===== */

  if (!interaction.isButton()) return;

  /* ENTRAR */
  if (interaction.customId.startsWith("entrar_")) {

    const key = interaction.customId.replace("entrar_", "");
    const fila = filas[key];
    if (!fila) return;

    if (fila.jogadores.includes(interaction.user.id))
      return interaction.reply({ content: "Você já está na fila!", ephemeral: true });

    const max = modos[fila.modo];

    if (fila.jogadores.length >= max)
      return interaction.reply({ content: "Fila cheia!", ephemeral: true });

    fila.jogadores.push(interaction.user.id);

    await atualizarMensagemFila(interaction, fila, key);

    if (fila.jogadores.length === max) {
      await criarPartida(interaction.guild, fila);
      fila.jogadores = [];
    }
  }

  /* SAIR */
  if (interaction.customId.startsWith("sair_")) {

    const key = interaction.customId.replace("sair_", "");
    const fila = filas[key];
    if (!fila) return;

    fila.jogadores = fila.jogadores.filter(id => id !== interaction.user.id);
    await atualizarMensagemFila(interaction, fila, key);
  }

  /* ENCERRAR */
  if (interaction.customId === "encerrar_partida") {

    if (!interaction.member.roles.cache.some(r => r.name === "Mediador"))
      return interaction.reply({ content: "Apenas Mediador pode encerrar.", ephemeral: true });

    await interaction.channel.delete();
  }

});

/* ================= FUNÇÕES ================= */

async function atualizarMensagemFila(interaction, fila, key) {

  const max = modos[fila.modo];

  const lista = fila.jogadores.length > 0
    ? fila.jogadores.map(id => `<@${id}>`).join("\n")
    : "Nenhum";

  const embed = new EmbedBuilder()
    .setTitle(`Fila ${fila.modo}`)
    .setDescription(
      `⚔ Tipo: ${fila.tipo}\n💰 Preço: R$ ${fila.preco}\n\n👥 Jogadores (${fila.jogadores.length}/${max}):\n${lista}`
    )
    .setColor("Blue");

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`entrar_${key}`)
      .setLabel("Entrar")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`sair_${key}`)
      .setLabel("Sair")
      .setStyle(ButtonStyle.Danger)
  );

  await interaction.update({
    embeds: [embed],
    components: [row]
  });
}

async function criarPartida(guild, fila) {

  const categoria = guild.channels.cache.find(
    c => c.name === "rush" && c.type === ChannelType.GuildCategory
  );

  if (!categoria) return;

  const canal = await guild.channels.create({
    name: `partida-${fila.modo}-${fila.preco}`,
    type: ChannelType.GuildText,
    parent: categoria.id,
    permissionOverwrites: [
      {
        id: guild.roles.everyone,
        deny: [PermissionFlagsBits.ViewChannel]
      }
    ]
  });

  for (const id of fila.jogadores) {
    await canal.permissionOverwrites.create(id, {
      ViewChannel: true,
      SendMessages: true
    });
  }

  const mediador = guild.roles.cache.find(r => r.name === "Mediador");

  if (mediador) {
    await canal.permissionOverwrites.create(mediador.id, {
      ViewChannel: true,
      SendMessages: true
    });
  }

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("encerrar_partida")
      .setLabel("Encerrar Partida")
      .setStyle(ButtonStyle.Danger)
  );

  await canal.send({
    content: `🎮 Partida criada!\n⚔ ${fila.modo}\n💰 R$ ${fila.preco}`,
    components: [row]
  });
}

/* ================= LOGIN ================= */

client.login(TOKEN);
