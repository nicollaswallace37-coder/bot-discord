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
  ChannelType,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Events,
  PermissionFlagsBits
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

const TOKEN = process.env.TOKEN;

const filas = {};


/***********************
 * READY
 ***********************/
client.once("ready", () => {
  console.log(`🔥 Logado como ${client.user.tag}`);
});


/***********************
 * CRIAR PARTIDA
 ***********************/
async function criarPartida(guild, key) {

  const fila = filas[key];
  if (!fila) return;

  const categoria = guild.channels.cache.find(
    c => c.name === "rush" && c.type === ChannelType.GuildCategory
  );

  if (!categoria) return;

  const canal = await guild.channels.create({
    name: `partida-${fila.modo}-${fila.preco}`,
    type: ChannelType.GuildText,
    parent: categoria.id,
    permissionOverwrites: [
      {
        id: guild.roles.everyone,
        deny: [PermissionFlagsBits.ViewChannel]
      }
    ]
  });

  // liberar jogadores
  for (const id of fila.jogadores) {
    await canal.permissionOverwrites.create(id, {
      ViewChannel: true,
      SendMessages: true
    });
  }

  // liberar mediador
  const mediador = guild.roles.cache.find(r => r.name === "Mediador");

  if (mediador) {
    await canal.permissionOverwrites.create(mediador.id, {
      ViewChannel: true,
      SendMessages: true
    });
  }

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`confirmar_${fila.preco}`)
      .setLabel("Confirmar")
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId("encerrar_chat")
      .setLabel("Encerrar Chat")
      .setStyle(ButtonStyle.Danger)
  );

  await canal.send({
    content: `🎮 **Partida criada!**
⚔ ${fila.modo}
💰 Valor: R$ ${fila.preco}`,
    components: [row]
  });

  // limpa jogadores da fila
  fila.jogadores = [];
}


/***********************
 * INTERAÇÕES
 ***********************/
client.on(Events.InteractionCreate, async interaction => {

  if (!interaction.isButton()) return;

  /* ================= ENTRAR NA FILA ================= */
  if (interaction.customId.startsWith("fila_")) {

    const [_, modo, preco] = interaction.customId.split("_");
    const key = interaction.customId;

    if (!filas[key]) {
      filas[key] = {
        modo: modo,
        preco: preco,
        jogadores: []
      };
    }

    const fila = filas[key];

    if (fila.jogadores.includes(interaction.user.id)) {
      return interaction.reply({
        content: "❌ Você já está na fila.",
        ephemeral: true
      });
    }

    fila.jogadores.push(interaction.user.id);

    await interaction.reply({
      content: `✅ Você entrou na fila (${fila.jogadores.length}/2)`,
      ephemeral: true
    });

    // FECHOU FILA
    if (fila.jogadores.length >= 2) {
      await criarPartida(interaction.guild, key);
    }
  }


  /* ================= CONFIRMAR PAGAMENTO ================= */
  if (interaction.customId.startsWith("confirmar_")) {

    if (!interaction.member.roles.cache.some(r => r.name === "Mediador")) {
      return interaction.reply({
        content: "❌ Apenas Mediadores podem usar.",
        ephemeral: true
      });
    }

    const valor = interaction.customId.replace("confirmar_", "");

    await interaction.channel.send(
`💰 **Pagamento Confirmado**

Pix: 450.553.628.98
Valor: R$ ${valor}`
    );

    return interaction.reply({
      content: "✅ Pagamento confirmado.",
      ephemeral: true
    });
  }


  /* ================= ENCERRAR CHAT ================= */
  if (interaction.customId === "encerrar_chat") {

    if (!interaction.member.roles.cache.some(r => r.name === "Mediador")) {
      return interaction.reply({
        content: "❌ Apenas Mediadores podem encerrar.",
        ephemeral: true
      });
    }

    await interaction.reply({
      content: "🗑 Encerrando partida...",
      ephemeral: true
    });

    setTimeout(() => {
      interaction.channel.delete().catch(() => {});
    }, 1500);
  }

});


/***********************
 * LOGIN
 ***********************/
client.login(TOKEN);
