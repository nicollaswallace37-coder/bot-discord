require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  Partials,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ChannelType,
  PermissionsBitField,
  EmbedBuilder
} = require("discord.js");

const express = require("express");
const app = express();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.Channel]
});

const token = process.env.TOKEN;
if (!token) {
  console.error("TOKEN não encontrada.");
  process.exit(1);
}

// ===== CONFIG =====
const MEDIADOR_ROLE_NAME = "Mediador";

const tipos = ["Mobile", "Emu", "Misto", "Tático", "Full soco"];
const modos = ["1x1", "2x2", "3x3", "4x4"];
const precos = [
  "0,20","0,50","1","2","3","4","5","6","7","8","9","10","12","15","20"
];

// Armazena filas
const filas = new Map();

// ================== READY ==================
client.once("ready", () => {
  console.log(`✅ Bot online como ${client.user.tag}`);
});

// ================== COMANDO /fila ==================
client.on("interactionCreate", async (interaction) => {

  // ===== COMANDO =====
  if (interaction.isChatInputCommand()) {

    if (interaction.commandName === "fila") {

      const tipoMenu = new StringSelectMenuBuilder()
        .setCustomId("select_tipo")
        .setPlaceholder("Selecione o tipo")
        .addOptions(tipos.map(t => ({ label: t, value: t })));

      const modoMenu = new StringSelectMenuBuilder()
        .setCustomId("select_modo")
        .setPlaceholder("Selecione o modo")
        .addOptions(modos.map(m => ({ label: m, value: m })));

      const precoMenu = new StringSelectMenuBuilder()
        .setCustomId("select_preco")
        .setPlaceholder("Selecione o preço")
        .addOptions(precos.map(p => ({ label: `R$ ${p}`, value: p })));

      const criarBtn = new ButtonBuilder()
        .setCustomId("criar_fila")
        .setLabel("Criar Fila")
        .setStyle(ButtonStyle.Success);

      await interaction.reply({
        content: "⚙️ Configure sua fila:",
        components: [
          new ActionRowBuilder().addComponents(tipoMenu),
          new ActionRowBuilder().addComponents(modoMenu),
          new ActionRowBuilder().addComponents(precoMenu),
          new ActionRowBuilder().addComponents(criarBtn)
        ]
      });
    }
  }

  // ===== SELECT =====
  if (interaction.isStringSelectMenu()) {

    const userId = interaction.user.id;

    if (!filas.has(userId)) filas.set(userId, {});

    const dados = filas.get(userId);

    if (interaction.customId === "select_tipo") {
      dados.tipo = interaction.values[0];
    }

    if (interaction.customId === "select_modo") {
      dados.modo = interaction.values[0];
    }

    if (interaction.customId === "select_preco") {
      dados.preco = interaction.values[0];
    }

    filas.set(userId, dados);

    await interaction.reply({ content: "✅ Selecionado!", ephemeral: true });
  }

  // ===== BOTÕES =====
  if (interaction.isButton()) {

    // CRIAR FILA
    if (interaction.customId === "criar_fila") {

      const dados = filas.get(interaction.user.id);
      if (!dados?.tipo || !dados?.modo || !dados?.preco) {
        return interaction.reply({
          content: "❌ Configure tipo, modo e preço primeiro.",
          ephemeral: true
        });
      }

      const idFila = `${dados.tipo}-${dados.modo}-${dados.preco}`;

      if (!filas.has(idFila)) {
        filas.set(idFila, {
          jogadores: [],
          config: dados
        });
      }

      const fila = filas.get(idFila);

      const entrarBtn = new ButtonBuilder()
        .setCustomId(`entrar_${idFila}`)
        .setLabel("Entrar")
        .setStyle(ButtonStyle.Primary);

      const sairBtn = new ButtonBuilder()
        .setCustomId(`sair_${idFila}`)
        .setLabel("Sair")
        .setStyle(ButtonStyle.Danger);

      const embed = new EmbedBuilder()
        .setTitle(`Fila ${dados.modo} - ${dados.tipo}`)
        .setDescription(`💰 R$ ${dados.preco}\n\n👥 Jogadores:\nNinguém ainda`)
        .setColor("Green");

      await interaction.channel.send({
        embeds: [embed],
        components: [new ActionRowBuilder().addComponents(entrarBtn, sairBtn)]
      });

      await interaction.reply({ content: "✅ Fila criada!", ephemeral: true });
    }

    // ENTRAR
    if (interaction.customId.startsWith("entrar_")) {

      const idFila = interaction.customId.replace("entrar_", "");
      const fila = filas.get(idFila);

      if (!fila) return;

      if (!fila.jogadores.includes(interaction.user.id)) {
        fila.jogadores.push(interaction.user.id);
      }

      await atualizarMensagem(interaction, fila);

      // Se completar
      const quantidade = parseInt(fila.config.modo.split("x")[0]) * 2;

      if (fila.jogadores.length >= quantidade) {
        await criarSalaPrivada(interaction.guild, fila);
        fila.jogadores = [];
      }

      await interaction.deferUpdate();
    }

    // SAIR
    if (interaction.customId.startsWith("sair_")) {

      const idFila = interaction.customId.replace("sair_", "");
      const fila = filas.get(idFila);

      if (!fila) return;

      fila.jogadores = fila.jogadores.filter(id => id !== interaction.user.id);

      await atualizarMensagem(interaction, fila);
      await interaction.deferUpdate();
    }

    // ENCERRAR SALA
    if (interaction.customId.startsWith("encerrar_")) {

      const role = interaction.member.roles.cache.find(r => r.name === MEDIADOR_ROLE_NAME);
      if (!role) {
        return interaction.reply({ content: "❌ Apenas mediador pode encerrar.", ephemeral: true });
      }

      await interaction.channel.delete();
    }
  }

});

// ===== ATUALIZAR EMBED =====
async function atualizarMensagem(interaction, fila) {

  const nomes = fila.jogadores.map(id => `<@${id}>`).join("\n") || "Ninguém ainda";

  const embed = new EmbedBuilder()
    .setTitle(`Fila ${fila.config.modo} - ${fila.config.tipo}`)
    .setDescription(`💰 R$ ${fila.config.preco}\n\n👥 Jogadores:\n${nomes}`)
    .setColor("Green");

  await interaction.message.edit({ embeds: [embed] });
}

// ===== CRIAR SALA PRIVADA =====
async function criarSalaPrivada(guild, fila) {

  const mediadorRole = guild.roles.cache.find(r => r.name === MEDIADOR_ROLE_NAME);

  const canal = await guild.channels.create({
    name: `sala-${fila.config.modo}`,
    type: ChannelType.GuildText,
    permissionOverwrites: [
      {
        id: guild.roles.everyone.id,
        deny: [PermissionsBitField.Flags.ViewChannel]
      },
      ...fila.jogadores.map(id => ({
        id: id,
        allow: [PermissionsBitField.Flags.ViewChannel]
      })),
      mediadorRole && {
        id: mediadorRole.id,
        allow: [PermissionsBitField.Flags.ViewChannel]
      }
    ].filter(Boolean)
  });

  const encerrarBtn = new ButtonBuilder()
    .setCustomId(`encerrar_${canal.id}`)
    .setLabel("Encerrar Sala")
    .setStyle(ButtonStyle.Danger);

  await canal.send({
    content: "Sala criada! 🔥",
    components: [new ActionRowBuilder().addComponents(encerrarBtn)]
  });
}

// ===== LOGIN =====
client.login(token);

// ===== SERVIDOR RENDER =====
app.get("/", (req, res) => {
  res.send("Bot online 🚀");
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🌍 Porta ${PORT}`);
});
