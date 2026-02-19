/***********************
 * SERVIDOR RENDER
 ***********************/
const express = require("express");
const app = express();

app.get("/", (req, res) => res.send("Bot online!"));
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

client.once("ready", () => {
  console.log("Bot online");
});

/***********************
 * INTERAÇÕES
 ***********************/
client.on("interactionCreate", async (interaction) => {
  try {

    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === "painel") {

        if (!interaction.member.roles.cache.some(r =>
          r.name.toLowerCase() === "mediador"
        )) {
          return interaction.reply({
            content: "❌ Apenas mediador pode usar.",
            ephemeral: true
          });
        }

        const row = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId("modo_select")
            .setPlaceholder("Escolha o modo")
            .addOptions([
              { label: "1v1", value: "1v1" },
              { label: "2v2", value: "2v2" },
              { label: "3v3", value: "3v3" },
              { label: "4v4", value: "4v4" }
            ])
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
          content: "Digite os valores separados por vírgula (Ex: 10, 20)",
          components: []
        });
      }
    }

    if (!interaction.isButton()) return;

    /* CONFIRMAR */
    if (interaction.customId.startsWith("confirmar_")) {

      if (!interaction.member.roles.cache.some(r =>
        r.name.toLowerCase() === "mediador"
      )) {
        return interaction.reply({ content: "❌ Apenas mediador.", ephemeral: true });
      }

      const valor = interaction.customId.replace("confirmar_", "");

      await interaction.reply({
        content: "✅ Pagamento confirmado!",
        ephemeral: true
      });

      await interaction.channel.send(
        `💰 Pix: 450.553.628.98\nValor: R$ ${valor}`
      );
    }

    /* ENCERRAR */
    if (interaction.customId === "encerrar_partida") {

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
 * MENSAGENS
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
        `Tipo: ${dados.tipo}\nValor: R$ ${valor}\n\nJogadores (0/${modos[dados.modo]})`
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
