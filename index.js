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
 * SLASH COMMAND
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
        return interaction.reply({
          content: "❌ Apenas mediador.",
          ephemeral: true
        });
      }

      const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("modo_select")
          .setPlaceholder("Escolha o modo")
          .addOptions(
            Object.keys(modos).map(m => ({
              label: m,
              value: m
            }))
          )
      );

      return interaction.reply({
        content: "Escolha o modo:",
        components: [row],
        ephemeral: true
      });
    }

    /* SELECT */
    if (interaction.isStringSelectMenu()) {

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
          content: "Digite os valores separados por vírgula (ex: 10, 20)",
          components: []
        });
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

      const embed = new EmbedBuilder()
        .setTitle(`Fila ${fila.modo}`)
        .setDescription(
          `Tipo: ${fila.tipo}
Valor: R$ ${fila.preco}

Jogadores (${fila.jogadores.length}/${max})
${fila.jogadores.map(id => `<@${id}>`).join("\n")}`
        );

      await interaction.message.edit({ embeds: [embed] });

      /* Se lotar cria canal */
      if (fila.jogadores.length >= max) {

        const guild = interaction.guild;
        const mediador = guild.roles.cache.find(r =>
          r.name.toLowerCase() === "mediador"
        );

        const canal = await guild.channels.create({
          name: `partida-${fila.modo}-${fila.preco}`,
          type: ChannelType.GuildText,
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
            })),
            {
              id: mediador.id,
              allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages
              ]
            }
          ]
        });

        await canal.send(
`🎮 Partida criada!
⚔ ${fila.modo}
📌 Tipo: ${fila.tipo}
💰 Valor: R$ ${fila.preco}

👥 Jogadores:
${fila.jogadores.map(id => `<@${id}>`).join("\n")}`
        );

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`confirmar_${fila.preco}`)
            .setLabel("Confirmar")
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId("encerrar_partida")
            .setLabel("Encerrar Chat")
            .setStyle(ButtonStyle.Danger)
        );

        await canal.send({
          content: `🔐 Painel do Mediador`,
          components: [row]
        });

        delete filas[key];
      }
    }

    /* CONFIRMAR */
    if (interaction.isButton() && interaction.customId.startsWith("confirmar_")) {

      if (!interaction.member.roles.cache.some(r =>
        r.name.toLowerCase() === "mediador"
      )) {
        return interaction.reply({ content: "❌ Apenas mediador.", ephemeral: true });
      }

      const valor = interaction.customId.replace("confirmar_", "");

      await interaction.reply({ content: "Pagamento confirmado.", ephemeral: true });

      await interaction.channel.send(
        `💰 Pix: 450.553.628.98
Valor: R$ ${valor}`
      );
    }

    /* ENCERRAR */
    if (interaction.isButton() && interaction.customId === "encerrar_partida") {

      if (!interaction.member.roles.cache.some(r =>
        r.name.toLowerCase() === "mediador"
      )) {
        return interaction.reply({ content: "❌ Apenas mediador.", ephemeral: true });
      }

      await interaction.reply({ content: "Encerrando...", ephemeral: true });

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
