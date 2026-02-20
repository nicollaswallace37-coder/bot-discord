require("dotenv").config();

/***********************
 * EXPRESS (PORTA RENDER)
 ***********************/
const express = require("express");
const app = express();

app.get("/", (req, res) => {
  res.send("Bot online ✅");
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Servidor web iniciado");
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
const PIX = "450.553.628.98";

const modos = {
  "1x1": 2,
  "2x2": 4
};

const filas = {};
const filasTemp = {};

/***********************
 * CALCULAR TAXA
 ***********************/
function calcularTaxa(valor) {
  const numero = parseFloat(valor);

  if (numero <= 0.70) {
    return numero + 0.20;
  }

  if (numero > 1) {
    return numero + numero * 0.20;
  }

  return numero;
}

client.once("ready", () => {
  console.log(`Bot logado como ${client.user.tag}`);
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
 * BOTÕES
 ***********************/
client.on("interactionCreate", async (interaction) => {

  if (!interaction.isButton()) return;

  const [acao, ...resto] = interaction.customId.split("_");
  const key = resto.join("_");

  const fila = filas[key];
  if (!fila) return;

  if (acao === "entrar") {

    if (fila.jogadores.includes(interaction.user.id))
      return interaction.reply({ content: "Você já está na fila.", ephemeral: true });

    fila.jogadores.push(interaction.user.id);

    await atualizarFila(interaction, key);

    if (fila.jogadores.length === modos[fila.modo]) {

      await criarChatPrivado(interaction.guild, fila);

      fila.jogadores = [];

      await criarMensagemFila(interaction.channel, key);
    }
  }

  if (acao === "sair") {

    fila.jogadores = fila.jogadores.filter(id => id !== interaction.user.id);
    await atualizarFila(interaction, key);
  }

  if (acao === "confirmar") {
    await interaction.reply({ content: "Pagamento confirmado ✅", ephemeral: true });
  }

  if (acao === "encerrar") {
    await interaction.channel.delete().catch(() => {});
  }
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
async function atualizarFila(interaction, key) {

  const fila = filas[key];

  const embed = new EmbedBuilder()
    .setTitle(`Fila ${fila.modo}`)
    .setDescription(
`Tipo: ${fila.tipo}
Valor: R$ ${fila.preco}

Jogadores (${fila.jogadores.length}/${modos[fila.modo]})`
    );

  await interaction.update({ embeds: [embed] });
}

/***********************
 * CRIAR CHAT PRIVADO
 ***********************/
async function criarChatPrivado(guild, fila) {

  const valorFinal = calcularTaxa(fila.preco).toFixed(2);

  const canal = await guild.channels.create({
    name: `partida-${fila.preco}`,
    type: ChannelType.GuildText,
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

Chave Pix:
${PIX}`
    );

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`confirmar_${fila.preco}`)
      .setLabel("Confirmar Pagamento")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`encerrar_${fila.preco}`)
      .setLabel("Encerrar Chat")
      .setStyle(ButtonStyle.Danger)
  );

  await canal.send({ embeds: [embed], components: [row] });
}

client.login(TOKEN);
