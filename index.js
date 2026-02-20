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
        return interaction.reply({ content: "❌ Apenas mediador.", flags: 64 });
      }

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
        flags: 64
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
          content: "Digite os valores separados por vírgula (ex: 10,20)",
          components: []
        });
      }
    }

    /***********************
     * BOTÃO ENTRAR
     ***********************/
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

      await interaction.message.edit({ embeds: [embed], components: [row] });

      if (fila.jogadores.length >= max) {

        const guild = interaction.guild;

        const categoria = guild.channels.cache.find(c =>
          c.name.toLowerCase() === "rush" &&
          c.type === ChannelType.GuildCategory
        );

        const mediador = guild.roles.cache.find(r =>
          r.name.toLowerCase() === "mediador"
        );

        const canal = await guild.channels.create({
          name: `partida-${fila.modo}-${fila.preco}`,
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

        const painelRow = new ActionRowBuilder().addComponents(
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
          content: `<@&${mediador.id}> Painel do Mediador`,
          components: [painelRow],
          allowedMentions: { roles: [mediador.id] }
        });

        fila.jogadores = [];

        const novoEmbed = new EmbedBuilder()
          .setTitle(`Fila ${fila.modo}`)
          .setDescription(
`Tipo: ${fila.tipo}
Valor: R$ ${fila.preco}

Jogadores (0/${max})`
          );

        await interaction.message.edit({ embeds: [novoEmbed], components: [row] });
      }
    }

    /***********************
     * CONFIRMAR
     ***********************/
    if (interaction.isButton() && interaction.customId.startsWith("confirmar_")) {

      if (!interaction.member.roles.cache.some(r =>
        r.name.toLowerCase() === "mediador"
      )) {
        return interaction.reply({ content: "❌ Apenas mediador.", flags: 64 });
      }

      const valor = interaction.customId.replace("confirmar_", "");

      await interaction.reply({ content: "Pagamento confirmado.", flags: 64 });

      await interaction.channel.send(
`💰 Pix: 450.553.628.98
Valor: R$ ${valor}`
      );
    }

    /***********************
     * ENCERRAR
     ***********************/
    if (interaction.isButton() && interaction.customId === "encerrar_partida") {

      if (!interaction.member.roles.cache.some(r =>
        r.name.toLowerCase() === "mediador"
      )) {
        return interaction.reply({ content: "❌ Apenas mediador.", flags: 64 });
      }

      await interaction.reply({ content: "Encerrando...", flags: 64 });

      setTimeout(() => {
        interaction.channel.delete().catch(() => {});
      }, 1500);
    }

  } catch (err) {
    console.log(err);
  }
});

client.login(TOKEN);
