require("dotenv").config();
const express = require("express");

/* ================= SERVIDOR PRA RENDER ================= */

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Bot online ✅");
});

app.listen(PORT, () => {
  console.log(`🌐 Servidor rodando na porta ${PORT}`);
});

/* ================= DISCORD ================= */

const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField,
  ChannelType
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages
  ]
});

const TOKEN = process.env.TOKEN;

const filas = {};

const modos = {
  "1x1": 2,
  "2x2": 4
};

const precos = {
  "1x1": 10,
  "2x2": 20
};

client.once("ready", () => {
  console.log("🤖 Bot online!");
});

client.on("interactionCreate", async interaction => {

  /* ================= COMANDO /fila ================= */

  if (interaction.isChatInputCommand() && interaction.commandName === "fila") {

    const modo = interaction.options.getString("modo");
    const tipo = interaction.options.getString("tipo");

    const id = `${modo}_${Date.now()}`;

    filas[id] = {
      modo,
      tipo,
      jogadores: [],
      treino: false
    };

    const embed = new EmbedBuilder()
      .setTitle(`Fila ${modo}`)
      .setDescription(
`Tipo: ${tipo}
Valor: R$ ${precos[modo]}

Jogadores (0/${modos[modo]})`
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`entrar_${id}`)
        .setLabel("Entrar")
        .setStyle(ButtonStyle.Success)
    );

    await interaction.reply({ embeds: [embed], components: [row] });
  }

  /* ================= COMANDO /fila_treino ================= */

  if (interaction.isChatInputCommand() && interaction.commandName === "fila_treino") {

    const modo = interaction.options.getString("modo");
    const tipo = interaction.options.getString("tipo");

    const id = `treino_${modo}_${Date.now()}`;

    filas[id] = {
      modo,
      tipo,
      jogadores: [],
      treino: true
    };

    const embed = new EmbedBuilder()
      .setTitle(`Fila Treino ${modo}`)
      .setDescription(
`Tipo: ${tipo}

Jogadores (0/${modos[modo]})`
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`entrar_${id}`)
        .setLabel("Entrar")
        .setStyle(ButtonStyle.Success)
    );

    await interaction.reply({ embeds: [embed], components: [row] });
  }

  /* ================= BOTÃO ENTRAR ================= */

  if (interaction.isButton() && interaction.customId.startsWith("entrar_")) {

    const id = interaction.customId.replace("entrar_", "");
    const fila = filas[id];
    if (!fila) return;

    if (fila.jogadores.includes(interaction.user.id))
      return interaction.reply({ content: "Você já entrou!", ephemeral: true });

    fila.jogadores.push(interaction.user.id);

    const max = modos[fila.modo];

    let embed;

    if (fila.treino) {
      embed = new EmbedBuilder()
        .setTitle(`Fila Treino ${fila.modo}`)
        .setDescription(
`Tipo: ${fila.tipo}

Jogadores (${fila.jogadores.length}/${max})
${fila.jogadores.map(id => `<@${id}>`).join("\n")}`
        );
    } else {
      embed = new EmbedBuilder()
        .setTitle(`Fila ${fila.modo}`)
        .setDescription(
`Tipo: ${fila.tipo}
Valor: R$ ${precos[fila.modo]}

Jogadores (${fila.jogadores.length}/${max})
${fila.jogadores.map(id => `<@${id}>`).join("\n")}`
        );
    }

    await interaction.update({ embeds: [embed] });

    if (fila.jogadores.length < max) return;

    /* ===== BUSCAR CATEGORIA PELO NOME ===== */

    const nomeCategoria = fila.treino ? "rush treino" : "rush";

    const categoria = interaction.guild.channels.cache.find(
      c =>
        c.type === ChannelType.GuildCategory &&
        c.name.toLowerCase() === nomeCategoria
    );

    if (!categoria)
      return interaction.followUp({
        content: `Categoria "${nomeCategoria}" não encontrada.`,
        ephemeral: true
      });

    const canal = await interaction.guild.channels.create({
      name: `partida-${fila.modo}`,
      type: ChannelType.GuildText,
      parent: categoria.id,
      permissionOverwrites: [
        {
          id: interaction.guild.id,
          deny: [PermissionsBitField.Flags.ViewChannel]
        },
        ...fila.jogadores.map(id => ({
          id,
          allow: [PermissionsBitField.Flags.ViewChannel]
        }))
      ]
    });

    if (fila.treino) {

      const rowTreino = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`encerrar_${id}`)
          .setLabel("Encerrar Treino")
          .setStyle(ButtonStyle.Danger)
      );

      await canal.send({
        content: "Finalizando o treino, por favor encerrar o treino.",
        components: [rowTreino]
      });

    } else {

      const rowConfirmar = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`confirmar_${id}`)
          .setLabel("Confirmar")
          .setStyle(ButtonStyle.Primary)
      );

      await canal.send({
        content: "Aguardando confirmação do pagamento.",
        components: [rowConfirmar]
      });
    }

    delete filas[id];
  }

  /* ================= BOTÃO CONFIRMAR ================= */

  if (interaction.isButton() && interaction.customId.startsWith("confirmar_")) {

    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator))
      return interaction.reply({ content: "Só ADM pode usar.", ephemeral: true });

    await interaction.reply({
      content: `Pix: 450.553.628.98`,
      ephemeral: false
    });
  }

  /* ================= BOTÃO ENCERRAR TREINO ================= */

  if (interaction.isButton() && interaction.customId.startsWith("encerrar_")) {
    await interaction.channel.delete();
  }

});

client.login(TOKEN);
