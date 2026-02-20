require("dotenv").config();

const express = require("express");
const app = express();
app.get("/", (req, res) => res.send("Bot online ✅"));
app.listen(process.env.PORT || 3000);

const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
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

const modos = {
  "1x1": 2,
  "2x2": 4,
  "3x3": 6,
  "4x4": 8
};

const filas = {};
const filasTemp = {};
const partidasAtivas = {}; // salva mediador por canal

function calcularTaxa(valor) {
  const numero = parseFloat(valor);
  if (numero <= 0.70) return numero + 0.20;
  return numero + numero * 0.20;
}

/**************** SLASH ****************/
const commands = [
  new SlashCommandBuilder()
    .setName("painel")
    .setDescription("Abrir painel")
    .toJSON()
];

const rest = new REST({ version: "10" }).setToken(TOKEN);
(async () => {
  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );
})();

/**************** READY ****************/
client.once("ready", () => {
  console.log("Bot online!");
});

/**************** INTERAÇÕES ****************/
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
          content: "Digite os valores separados por vírgula",
          components: []
        });
      }
    }

    if (interaction.isButton()) {

      const id = interaction.customId;

      /* ENTRAR / SAIR */
      if (id.startsWith("entrar_") || id.startsWith("sair_")) {

        await interaction.deferUpdate();

        const key = id.split("_").slice(1).join("_");
        const fila = filas[key];
        if (!fila) return;

        if (id.startsWith("entrar_")) {
          if (!fila.jogadores.includes(interaction.user.id))
            fila.jogadores.push(interaction.user.id);
        }

        if (id.startsWith("sair_")) {
          fila.jogadores = fila.jogadores.filter(id => id !== interaction.user.id);
        }

        if (fila.jogadores.length === modos[fila.modo]) {

          const canalCriado = await criarChatPrivado(interaction.guild, fila);

          partidasAtivas[canalCriado.id] = fila.mediador;

          fila.jogadores = [];
        }

        await atualizarFila(interaction.message, key);
      }

      /* CONFIRMAR */
      if (id === "confirmar_pagamento") {

        const mediador = partidasAtivas[interaction.channel.id];

        if (interaction.user.id !== mediador)
          return interaction.reply({
            content: "Apenas o mediador pode usar.",
            ephemeral: true
          });

        const modal = new ModalBuilder()
          .setCustomId("modal_sala")
          .setTitle("Lançar Sala");

        const codigo = new TextInputBuilder()
          .setCustomId("codigo")
          .setLabel("Código da Sala")
          .setStyle(TextInputStyle.Short);

        const senha = new TextInputBuilder()
          .setCustomId("senha")
          .setLabel("Senha da Sala")
          .setStyle(TextInputStyle.Short);

        modal.addComponents(
          new ActionRowBuilder().addComponents(codigo),
          new ActionRowBuilder().addComponents(senha)
        );

        return interaction.showModal(modal);
      }

      /* ENCERRAR */
      if (id === "encerrar_chat") {

        const mediador = partidasAtivas[interaction.channel.id];

        if (interaction.user.id !== mediador)
          return interaction.reply({
            content: "Apenas o mediador pode encerrar.",
            ephemeral: true
          });

        delete partidasAtivas[interaction.channel.id];
        return interaction.channel.delete();
      }
    }

    if (interaction.isModalSubmit()) {

      const codigo = interaction.fields.getTextInputValue("codigo");
      const senha = interaction.fields.getTextInputValue("senha");

      await interaction.reply({
        content: `🎮 Sala criada!\nCódigo: ${codigo}\nSenha: ${senha}`
      });
    }

  } catch (err) {
    console.log(err);
  }
});

/**************** RECEBER VALORES ****************/
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
      jogadores: [],
      mediador: message.author.id
    };

    await criarMensagemFila(message.channel, key);
  }

  await message.delete().catch(() => {});
});

/**************** FILA ****************/
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

/**************** CHAT ****************/
async function criarChatPrivado(guild, fila) {

  const categoria = guild.channels.cache.find(c =>
    c.name.toLowerCase() === "rush" &&
    c.type === ChannelType.GuildCategory
  );

  const valorFinal = calcularTaxa(fila.preco).toFixed(2);

  const canal = await guild.channels.create({
    name: `${fila.tipo}-${fila.modo}`,
    type: ChannelType.GuildText,
    parent: categoria ? categoria.id : null,
    permissionOverwrites: [
      { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
      ...fila.jogadores.map(id => ({
        id,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
      }))
    ]
  });

  const embed = new EmbedBuilder()
    .setTitle("Pagamento da Partida")
    .setDescription(
`Valor final: R$ ${valorFinal}

Pix:
${PIX}`
    );

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("confirmar_pagamento")
      .setLabel("Confirmar")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("encerrar_chat")
      .setLabel("Encerrar")
      .setStyle(ButtonStyle.Danger)
  );

  await canal.send({ embeds: [embed], components: [row] });

  return canal;
}

client.login(TOKEN);
