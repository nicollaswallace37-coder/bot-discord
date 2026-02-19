/***********************
 * EXPRESS (Render)
 ***********************/
const express = require("express");
const app = express();
app.get("/", (req, res) => res.send("Bot online"));
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
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent
  ]
});

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

/***********************
 * SLASH
 ***********************/
const commands = [
  new SlashCommandBuilder()
    .setName("painel")
    .setDescription("Abrir painel")
    .toJSON(),

  new SlashCommandBuilder()
    .setName("fila_treino")
    .setDescription("Criar fila de treino")
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
const modos = { "1v1": 2, "2v2": 4, "3v3": 6, "4v4": 8 };
const filasTemp = {};
const filas = {};

/***********************
 * READY
 ***********************/
client.once("ready", () => {
  console.log("Bot online");
});

/***********************
 * INTERAÇÕES
 ***********************/
client.on("interactionCreate", async (interaction) => {
  try {

    /* SLASH */
    if (interaction.isChatInputCommand()) {

      if (!interaction.member.roles.cache.some(r =>
        r.name.toLowerCase() === "mediador"
      )) {
        return interaction.reply({ content: "❌ Apenas mediador.", ephemeral: true });
      }

      /* COMANDO PAINEL */
      if (interaction.commandName === "painel") {

        const row = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId("modo_select")
            .setPlaceholder("Escolha o modo")
            .addOptions(
              Object.keys(modos).map(m => ({ label: m, value: m }))
            )
        );

        return interaction.reply({
          content: "Escolha o modo:",
          components: [row],
          ephemeral: true
        });
      }

      /* COMANDO FILA TREINO */
      if (interaction.commandName === "fila_treino") {

        const row = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId("modo_treino_select")
            .setPlaceholder("Escolha o modo")
            .addOptions(
              Object.keys(modos).map(m => ({ label: m, value: m }))
            )
        );

        return interaction.reply({
          content: "Escolha o modo do treino:",
          components: [row],
          ephemeral: true
        });
      }
    }

    /* SELECT */
    if (interaction.isStringSelectMenu()) {

      /* SISTEMA NORMAL */
      if (interaction.customId === "modo_select") {

        const modo = interaction.values[0];

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
          content: "Digite os valores separados por vírgula (ex: 10,20)",
          components: []
        });
      }

      /* SISTEMA TREINO */
      if (interaction.customId === "modo_treino_select") {

        const modo = interaction.values[0];

        const row = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(`tipo_treino_${modo}`)
            .setPlaceholder("Escolha o tipo")
            .addOptions([
              { label: "mobile", value: "mobile" },
              { label: "emu", value: "emu" },
              { label: "misto", value: "misto" },
              { label: "tatico", value: "tatico" },
              { label: "full soco", value: "full soco" }
            ])
        );

        return interaction.update({
          content: "Escolha o tipo:",
          components: [row]
        });
      }

      if (interaction.customId.startsWith("tipo_treino_")) {

        const modo = interaction.customId.replace("tipo_treino_", "");
        const tipo = interaction.values[0];

        const key = `treino_${modo}_${tipo}`;

        filas[key] = {
          modo,
          tipo,
          treino: true,
          jogadores: []
        };

        const embed = new EmbedBuilder()
          .setTitle(`Fila Treino ${modo}`)
          .setDescription(
`Tipo: ${tipo}

Jogadores (0/${modos[modo]})`
          );

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`entrar_${key}`)
            .setLabel("Entrar")
            .setStyle(ButtonStyle.Success)
        );

        await interaction.channel.send({ embeds: [embed], components: [row] });

        return interaction.update({ content: "Fila de treino criada!", components: [] });
      }
    }

    /* BOTÃO ENTRAR */
    if (interaction.isButton() && interaction.customId.startsWith("entrar_")) {

      await interaction.deferUpdate();

      const key = interaction.customId.replace("entrar_", "");
      const fila = filas[key];
      if (!fila) return;

      if (fila.jogadores.includes(interaction.user.id)) return;

      fila.jogadores.push(interaction.user.id);
      const max = modos[fila.modo];

      /* TREINO */
      if (fila.treino && fila.jogadores.length >= max) {

        const guild = interaction.guild;

        const categoria = guild.channels.cache.find(c =>
          c.name === "rush treino" &&
          c.type === ChannelType.GuildCategory
        );

        const canal = await guild.channels.create({
          name: `treino-${fila.modo}`,
          type: ChannelType.GuildText,
          parent: categoria ? categoria.id : null,
          permissionOverwrites: [
            {
              id: guild.roles.everyone.id,
              deny: [PermissionFlagsBits.ViewChannel]
            },
            ...fila.jogadores.map(id => ({
              id,
              allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages
              ]
            }))
          ]
        });

        const rowTreino = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("encerrar_treino")
            .setLabel("Encerrar Treino")
            .setStyle(ButtonStyle.Danger)
        );

        await canal.send(
`🏋️ Treino iniciado!

Finalizando o treino, por favor encerrar o treino.`
        );

        await canal.send({ components: [rowTreino] });

        fila.jogadores = [];
        return;
      }
    }

    /* ENCERRAR TREINO */
    if (interaction.isButton() && interaction.customId === "encerrar_treino") {

      await interaction.reply({ content: "Encerrando treino...", ephemeral: true });

      setTimeout(() => {
        interaction.channel.delete().catch(() => {});
      }, 1500);
    }

  } catch (err) {
    console.log(err);
  }
});

/***********************
 * MESSAGE CREATE
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
`Tipo: ${dados.tipo}
Valor: R$ ${valor}

Jogadores (0/${modos[dados.modo]})`
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`entrar_${key}`)
        .setLabel("Entrar")
        .setStyle(ButtonStyle.Success)
    );

    await message.channel.send({ embeds: [embed], components: [row] });
  }

  await message.delete();
});

/***********************
 * LOGIN
 ***********************/
client.login(TOKEN);
