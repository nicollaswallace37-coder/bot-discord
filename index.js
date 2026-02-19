/***********************
 * SERVIDOR PARA RENDER
 ***********************/
const express = require("express");
const app = express();

app.get("/", (req, res) => {
  res.send("Bot online!");
});

app.listen(process.env.PORT || 3000, () => {
  console.log("🌐 Servidor web iniciado.");
});

/***********************
 * DISCORD
 ***********************/
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ChannelType,
  PermissionFlagsBits
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const TOKEN = process.env.TOKEN;

/***********************
 * CONFIG
 ***********************/
const modos = {
  "1v1": 2,
  "2v2": 4,
  "3v3": 6,
  "4v4": 8
};

const filasTemp = {};
const filas = {};

/***********************
 * BOT ONLINE
 ***********************/
client.once("ready", () => {
  console.log(`✅ Logado como ${client.user.tag}`);
});

/***********************
 * INTERAÇÕES
 ***********************/
client.on("interactionCreate", async (interaction) => {
  try {

    /* ===== MENU MODO ===== */
    if (interaction.isStringSelectMenu() && interaction.customId === "modo_select") {

      await interaction.deferUpdate();

      const modo = interaction.values[0];

      const embed = new EmbedBuilder()
        .setTitle("Escolha o tipo")
        .setColor("Blue");

      const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`tipo_${modo}`)
          .setPlaceholder("Escolha o tipo")
          .addOptions([
            { label: "mobile", value: "mobile" },
            { label: "emu", value: "emu" },
            { label: "misto", value: "misto" },
            { label: "tatico", value: "tatico" },
            { label: "full soco", value: "full soco" }
          ])
      );

      return interaction.message.edit({ embeds: [embed], components: [row] });
    }

    /* ===== MENU TIPO ===== */
    if (interaction.isStringSelectMenu() && interaction.customId.startsWith("tipo_")) {

      await interaction.deferReply({ ephemeral: true });

      const modo = interaction.customId.replace("tipo_", "");
      const tipo = interaction.values[0];

      filasTemp[interaction.user.id] = { modo, tipo };

      return interaction.editReply({
        content: "Digite os valores separados por vírgula\nEx: 0.20, 5.90, 10"
      });
    }

    if (!interaction.isButton()) return;

    await interaction.deferUpdate();

    /* ===== ENTRAR ===== */
    if (interaction.customId.startsWith("entrar_")) {

      const key = interaction.customId.replace("entrar_", "");
      const fila = filas[key];
      if (!fila) return;

      if (fila.jogadores.includes(interaction.user.id)) return;

      const max = modos[fila.modo];
      if (fila.jogadores.length >= max) return;

      fila.jogadores.push(interaction.user.id);

      await atualizarMensagem(interaction, fila, key);

      if (fila.jogadores.length === max) {
        await criarPartida(interaction.guild, fila);
        fila.jogadores = [];
      }
    }

    /* ===== SAIR ===== */
    if (interaction.customId.startsWith("sair_")) {

      const key = interaction.customId.replace("sair_", "");
      const fila = filas[key];
      if (!fila) return;

      fila.jogadores = fila.jogadores.filter(id => id !== interaction.user.id);

      await atualizarMensagem(interaction, fila, key);
    }

    /* ===== ENCERRAR ===== */
    if (interaction.customId === "encerrar_partida") {

      if (!interaction.member.roles.cache.some(r => r.name === "Mediador"))
        return;

      await interaction.channel.delete();
    }

  } catch (err) {
    console.log("Erro na interação:", err);
  }
});

/***********************
 * RECEBER VALORES
 ***********************/
client.on("messageCreate", async (message) => {

  if (message.author.bot) return;

  const dados = filasTemp[message.author.id];
  if (!dados) return;

  const valores = message.content.split(",").map(v => v.trim());

  delete filasTemp[message.author.id];

  for (const valor of valores) {

    const key = `${dados.modo}_${dados.tipo}_${valor}`;

    filas[key] = {
      modo: dados.modo,
      tipo: dados.tipo,
      preco: valor,
      jogadores: []
    };

    const embed = new EmbedBuilder()
      .setTitle(`Fila ${dados.modo}`)
      .setDescription(
        `⚔ Tipo: ${dados.tipo}\n💰 Valor: R$ ${valor}\n\n👥 Jogadores (0/${modos[dados.modo]}):\nNenhum`
      )
      .setColor("Green");

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

    await message.channel.send({ embeds: [embed], components: [row] });
  }

  await message.delete();
});

/***********************
 * ATUALIZAR EMBED
 ***********************/
async function atualizarMensagem(interaction, fila, key) {

  const max = modos[fila.modo];

  const lista = fila.jogadores.length
    ? fila.jogadores.map(id => `<@${id}>`).join("\n")
    : "Nenhum";

  const embed = new EmbedBuilder()
    .setTitle(`Fila ${fila.modo}`)
    .setDescription(
      `⚔ Tipo: ${fila.tipo}\n💰 Valor: R$ ${fila.preco}\n\n👥 Jogadores (${fila.jogadores.length}/${max}):\n${lista}`
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

  await interaction.message.edit({
    embeds: [embed],
    components: [row]
  });
}

/***********************
 * CRIAR PARTIDA
 ***********************/
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

client.login(TOKEN);
