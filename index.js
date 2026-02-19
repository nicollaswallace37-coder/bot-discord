/***********************
 * SERVIDOR RENDER
 ***********************/
const express = require("express");
const app = express();

app.get("/", (req, res) => res.send("Bot online!"));

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
  PermissionFlagsBits,
  REST,
  Routes,
  SlashCommandBuilder
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

/***********************
 * REGISTRAR SLASH
 ***********************/
const commands = [
  new SlashCommandBuilder()
    .setName("painel")
    .setDescription("Abrir painel de criação de fila")
    .toJSON()
];

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );
  console.log("✅ Slash registrado");
})();

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
  console.log(`🤖 Logado como ${client.user.tag}`);
});

/***********************
 * INTERAÇÕES
 ***********************/
client.on("interactionCreate", async (interaction) => {
  try {

    /* SLASH */
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === "painel") {

        const embed = new EmbedBuilder()
          .setTitle("Criar Fila")
          .setDescription("Escolha o modo")
          .setColor("Blue");

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

        return interaction.reply({ embeds: [embed], components: [row] });
      }
    }

    /* SELECT MODO */
    if (interaction.isStringSelectMenu() && interaction.customId === "modo_select") {

      await interaction.deferUpdate();

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

      return interaction.message.edit({ components: [row] });
    }

    /* SELECT TIPO */
    if (interaction.isStringSelectMenu() && interaction.customId.startsWith("tipo_")) {

      await interaction.deferReply({ ephemeral: true });

      const modo = interaction.customId.replace("tipo_", "");
      const tipo = interaction.values[0];

      filasTemp[interaction.user.id] = { modo, tipo };

      return interaction.editReply({
        content: "Digite os valores separados por vírgula\nEx: 10, 20"
      });
    }

    if (!interaction.isButton()) return;

    /* ENTRAR */
    if (interaction.customId.startsWith("entrar_")) {

      await interaction.deferUpdate();

      const key = interaction.customId.replace("entrar_", "");
      const fila = filas[key];
      if (!fila) return;

      if (!fila.jogadores.includes(interaction.user.id)) {
        fila.jogadores.push(interaction.user.id);
      }

      await atualizarMensagem(interaction, fila, key);

      if (fila.jogadores.length === modos[fila.modo]) {
        await criarPartida(interaction.guild, fila);
        fila.jogadores = [];
        await atualizarMensagem(interaction, fila, key);
      }
    }

    /* SAIR */
    if (interaction.customId.startsWith("sair_")) {

      await interaction.deferUpdate();

      const key = interaction.customId.replace("sair_", "");
      const fila = filas[key];
      if (!fila) return;

      fila.jogadores = fila.jogadores.filter(id => id !== interaction.user.id);
      await atualizarMensagem(interaction, fila, key);
    }

    /* CONFIRMAR */
    if (interaction.customId.startsWith("confirmar_")) {

      if (!interaction.member.roles.cache.some(r =>
        r.name.toLowerCase() === "mediador"
      )) {
        return interaction.reply({ content: "❌ Apenas mediadores.", ephemeral: true });
      }

      const valor = interaction.customId.replace("confirmar_", "");

      await interaction.reply({ content: "✅ Confirmado.", ephemeral: true });

      await interaction.channel.send(
`💰 **Pagamento Confirmado**

Pix: 450.553.628.98
Valor: R$ ${valor}`
      );
    }

    /* ENCERRAR */
    if (interaction.customId === "encerrar_partida") {

      if (!interaction.member.roles.cache.some(r =>
        r.name.toLowerCase() === "mediador"
      )) {
        return interaction.reply({ content: "❌ Apenas mediadores.", ephemeral: true });
      }

      await interaction.reply({ content: "🗑 Encerrando...", ephemeral: true });

      setTimeout(() => {
        interaction.channel.delete().catch(() => {});
      }, 1500);
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

  await interaction.message.edit({ embeds: [embed], components: [row] });
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
      { id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] }
    ]
  });

  for (const id of fila.jogadores) {
    await canal.permissionOverwrites.create(id, {
      ViewChannel: true,
      SendMessages: true
    });
  }

  const mediador = guild.roles.cache.find(r =>
    r.name.toLowerCase() === "mediador"
  );

  if (mediador) {
    await canal.permissionOverwrites.create(mediador.id, {
      ViewChannel: true,
      SendMessages: true
    });
  }

  await canal.send(
`🎮 **Partida criada!**
⚔ ${fila.modo}
📌 Tipo: ${fila.tipo}
💰 Valor: R$ ${fila.preco}

👥 Jogadores:
${fila.jogadores.map(id => `<@${id}>`).join("\n")}`
  );

  if (mediador) {
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
      content: `🔐 <@&${mediador.id}> Painel do Mediador`,
      components: [row],
      allowedMentions: { roles: [mediador.id] }
    });
  }
}

client.login(TOKEN);
