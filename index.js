require("dotenv").config();

/***********************
 * EXPRESS (RENDER)
 ***********************/
const express = require("express");
const app = express();

app.get("/", (req, res) => res.send("Bot online ✅"));
app.listen(process.env.PORT || 3000);

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
  PermissionFlagsBits,
  REST,
  Routes,
  SlashCommandBuilder
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
const PIX = "450.553.628.98";

/***********************
 * SLASH
 ***********************/
const commands = [
  new SlashCommandBuilder()
    .setName("painel")
    .setDescription("Abrir painel de criação")
    .toJSON()
];

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );
})();

/***********************
 * CONFIG
 ***********************/
const modos = {
  "1x1": 2,
  "2x2": 4,
  "3x3": 6,
  "4x4": 8
};

const filas = {};
const filasTemp = {};

/***********************
 * TAXA
 ***********************/
function calcularTaxa(valor) {
  const numero = parseFloat(valor);

  if (numero <= 0.70) return numero + 0.20;
  return numero + numero * 0.20;
}

/***********************
 * READY
 ***********************/
client.once("ready", () => {
  console.log(`Logado como ${client.user.tag}`);
});

/***********************
 * INTERAÇÕES
 ***********************/
client.on("interactionCreate", async (interaction) => {
  try {

    if (interaction.isChatInputCommand()) {

      if (interaction.commandName === "painel") {

        const row = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId("modo_select")
            .setPlaceholder("Escolha o modo")
            .addOptions(
              { label: "1x1", value: "1x1" },
              { label: "2x2", value: "2x2" },
              { label: "3x3", value: "3x3" },
              { label: "4x4", value: "4x4" }
            )
        );

        return interaction.reply({
          content: "Escolha o modo:",
          components: [row],
          ephemeral: true
        });
      }
    }

    if (interaction.isStringSelectMenu()) {

      if (interaction.customId === "modo_select") {

        const modo = interaction.values[0];

        const row = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(`tipo_${modo}`)
            .setPlaceholder("Escolha o tipo")
            .addOptions(
              { label: "mobile", value: "mobile" },
              { label: "emu", value: "emu" },
              { label: "misto", value: "misto" },
              { label: "tatico", value: "tatico" },
              { label: "full soco", value: "full soco" }
            )
        );

        return interaction.update({
          content: "Escolha o tipo:",
          components: [row]
        });
      }

      if (interaction.customId.startsWith("tipo_")) {

        const modo = interaction.customId.replace("tipo_", "");
        const tipo = interaction.values[0];

        filasTemp[interaction.user.id] = { modo, tipo };

        return interaction.update({
          content: "Digite os valores separados por vírgula (ex: 1,2,5)",
          components: []
        });
      }
    }

    if (interaction.isButton()) {

      await interaction.deferUpdate();

      const [acao, ...resto] = interaction.customId.split("_");
      const key = resto.join("_");
      const fila = filas[key];
      if (!fila) return;

      if (acao === "entrar") {

        if (!fila.jogadores.includes(interaction.user.id))
          fila.jogadores.push(interaction.user.id);

        await atualizarFila(interaction.message, key);

        if (fila.jogadores.length === modos[fila.modo]) {

          await criarChatPrivado(interaction.guild, fila);

          fila.jogadores = [];

          await atualizarFila(interaction.message, key);
        }
      }

      if (acao === "sair") {

        fila.jogadores = fila.jogadores.filter(id => id !== interaction.user.id);
        await atualizarFila(interaction.message, key);
      }

      if (acao === "confirmar") {
        await interaction.followUp({ content: "Pagamento confirmado ✅", ephemeral: true });
      }

      if (acao === "encerrar") {
        await interaction.channel.delete().catch(() => {});
      }
    }

  } catch (err) {
    console.log(err);
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

    await criarMensagemFila(message.channel, key);
  }

  await message.delete().catch(() => {});
});

/***********************
 * CRIAR FILA
 ***********************/
async function criarMensagemFila(channel, key) {

  const fila = filas[key];

  const embed = new EmbedBuilder()
    .setTitle(`Fila ${fila.modo}`)
    .setDescription(
`Tipo: ${fila.tipo}
Valor: R$ ${fila.preco}

Jogadores (0/${modos[fila.modo]})`
    );

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`entrar_${key}`)
      .setLabel("Entrar")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`sair_${key}`)
      .setLabel("Sair")
      .setStyle(ButtonStyle.Secondary)
  );

  await channel.send({ embeds: [embed], components: [row] });
}

/***********************
 * ATUALIZAR FILA
 ***********************/
async function atualizarFila(message, key) {

  const fila = filas[key];

  const embed = new EmbedBuilder()
    .setTitle(`Fila ${fila.modo}`)
    .setDescription(
`Tipo: ${fila.tipo}
Valor: R$ ${fila.preco}

Jogadores (${fila.jogadores.length}/${modos[fila.modo]})
${fila.jogadores.map(id => `<@${id}>`).join("\n") || "Nenhum jogador"}`
    );

  await message.edit({ embeds: [embed] });
}

/***********************
 * CHAT PRIVADO
 ***********************/
async function criarChatPrivado(guild, fila) {

  const categoria = guild.channels.cache.find(c =>
    c.name.toLowerCase() === "rush" &&
    c.type === ChannelType.GuildCategory
  );

  const valorFinal = calcularTaxa(fila.preco).toFixed(2);

  const canal = await guild.channels.create({
    name: `partida-${fila.preco}`,
    type: ChannelType.GuildText,
    parent: categoria ? categoria.id : null,
    permissionOverwrites: [
      {
        id: guild.id,
        deny: [PermissionFlagsBits.ViewChannel]
      },
      ...fila.jogadores.map(id => ({
        id,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
      }))
    ]
  });

  const embed = new EmbedBuilder()
    .setTitle("Pagamento da Partida")
    .setDescription(
`Valor da fila: R$ ${fila.preco}
Valor final com taxa: R$ ${valorFinal}

Pix do Mediador:
${PIX}`
    );

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("confirmar_pagamento")
      .setLabel("Confirmar Pagamento")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("encerrar_chat")
      .setLabel("Encerrar Chat")
      .setStyle(ButtonStyle.Danger)
  );

  await canal.send({ embeds: [embed], components: [row] });
}

client.login(TOKEN);
