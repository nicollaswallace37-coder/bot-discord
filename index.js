const {
  Client,
  GatewayIntentBits,
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Events,
  PermissionsBitField
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

const TOKEN = "SEU_TOKEN_AQUI";

const filas = {};

/* ================= READY ================= */

client.once("ready", () => {
  console.log(`🔥 Logado como ${client.user.tag}`);
});


/* ================= CRIAR PARTIDA ================= */

async function criarPartida(guild, filaKey) {

  const fila = filas[filaKey];
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
        deny: [PermissionsBitField.Flags.ViewChannel]
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
    content: `🎮 **Partida criada!**\n⚔ ${fila.modo}\n💰 Valor: R$ ${fila.preco}`,
    components: [row]
  });

  fila.jogadores = [];
}


/* ================= INTERAÇÕES ================= */

client.on(Events.InteractionCreate, async interaction => {

  if (interaction.isButton()) {

    /* ===== ENTRAR NA FILA ===== */
    if (interaction.customId.startsWith("fila_")) {

      const key = interaction.customId;

      if (!filas[key]) {
        filas[key] = {
          modo: key.split("_")[1],
          preco: key.split("_")[2],
          jogadores: []
        };
      }

      const fila = filas[key];

      if (fila.jogadores.includes(interaction.user.id))
        return interaction.reply({
          content: "❌ Você já está nessa fila.",
          ephemeral: true
        });

      fila.jogadores.push(interaction.user.id);

      await interaction.reply({
        content: `✅ Você entrou na fila (${fila.jogadores.length}/2)`,
        ephemeral: true
      });

      if (fila.jogadores.length >= 2) {
        await criarPartida(interaction.guild, key);
      }
    }


    /* ===== CONFIRMAR PAGAMENTO ===== */
    if (interaction.customId.startsWith("confirmar_")) {

      if (!interaction.member.roles.cache.some(r => r.name === "Mediador"))
        return interaction.reply({
          content: "❌ Apenas ADM pode usar este botão.",
          ephemeral: true
        });

      const valor = interaction.customId.replace("confirmar_", "");

      return interaction.reply({
        content: `💰 **Pagamento Confirmado**\n\nPix: 450.553.628.98\nValor: R$ ${valor}`
      });
    }


    /* ===== ENCERRAR CHAT ===== */
    if (interaction.customId === "encerrar_chat") {

      if (!interaction.member.roles.cache.some(r => r.name === "Mediador"))
        return interaction.reply({
          content: "❌ Apenas ADM pode encerrar.",
          ephemeral: true
        });

      await interaction.channel.delete();
    }

  }

});


/* ================= LOGIN ================= */

client.login(TOKEN);
