require("dotenv").config();

/***********************
 * EXPRESS
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

client.once("ready", () => {
  console.log(`Logado como ${client.user.tag}`);
});

/***********************
 * INTERAÇÕES
 ***********************/
client.on("interactionCreate", async (interaction) => {

  try {

    /******** SLASH ********/
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

    /******** SELECT ********/
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

    /******** BOTÕES DO CHAT ********/
    if (interaction.isButton()) {

      if (interaction.customId === "confirmar_pagamento") {

        const fila = Object.values(filas).find(f =>
          f.jogadores.includes(interaction.user.id)
        );

        if (!fila || fila.mediador !== interaction.user.id)
          return interaction.reply({
            content: "Apenas o mediador pode usar isso.",
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

      if (interaction.customId === "encerrar_chat") {
        return interaction.channel.delete().catch(() => {});
      }
    }

    /******** MODAL ********/
    if (interaction.isModalSubmit()) {

      if (interaction.customId === "modal_sala") {

        const codigo = interaction.fields.getTextInputValue("codigo");
        const senha = interaction.fields.getTextInputValue("senha");

        await interaction.reply({
          content: `🎮 **Sala criada!**\nCódigo: ${codigo}\nSenha: ${senha}`,
          ephemeral: false
        });
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
      jogadores: [],
      mediador: message.author.id
    };

    await message.channel.send(`Fila criada por <@${message.author.id}>`);
  }

  await message.delete().catch(() => {});
});

client.login(TOKEN);
