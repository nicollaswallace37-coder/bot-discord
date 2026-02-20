require("dotenv").config();
const express = require("express");
const app = express();

app.get("/", (req, res) => res.send("Bot online ✅"));
app.listen(process.env.PORT || 3000);

// ================= IMPORTS =================
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
  SlashCommandBuilder,
  Events
} = require("discord.js");

// ================= CLIENT =================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// ================= CONFIG =================
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const PIX = "45055362898";
const MODOS = { "1x1": 2, "2x2": 4, "3x3": 6, "4x4": 8 };

const configuracoesTemp = new Map();
const filasTreino = new Map();
const partidasPagas = new Map();

// ================= SLASH COMMANDS =================
const commands = [
  new SlashCommandBuilder()
    .setName("painel")
    .setDescription("Abrir painel de partida paga"),

  new SlashCommandBuilder()
    .setName("fila-treino")
    .setDescription("Criar fila de treino gratuita")
].map(c => c.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);

client.once("ready", async () => {
  console.log(`✅ Online como ${client.user.tag}`);

  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );
});

// ================= INTERACTIONS =================
client.on(Events.InteractionCreate, async interaction => {

  // =====================================================
  // =================== COMANDOS =========================
  // =====================================================

  if (interaction.isChatInputCommand()) {

    // ===== PAINEL PAGO =====
    if (interaction.commandName === "painel") {

      const modoMenu = new StringSelectMenuBuilder()
        .setCustomId("modo_pago")
        .setPlaceholder("Selecione o modo")
        .addOptions(
          { label: "1x1", value: "1x1" },
          { label: "2x2", value: "2x2" },
          { label: "3x3", value: "3x3" },
          { label: "4x4", value: "4x4" }
        );

      const criarBtn = new ButtonBuilder()
        .setCustomId("criar_partida_paga")
        .setLabel("Criar Partida")
        .setStyle(ButtonStyle.Success);

      return interaction.reply({
        content: "💰 Configure a partida paga:",
        components: [
          new ActionRowBuilder().addComponents(modoMenu),
          new ActionRowBuilder().addComponents(criarBtn)
        ]
      });
    }

    // ===== FILA TREINO =====
    if (interaction.commandName === "fila-treino") {

      const modoMenu = new StringSelectMenuBuilder()
        .setCustomId("modo_treino")
        .setPlaceholder("Selecione o modo")
        .addOptions(
          { label: "1x1", value: "1x1" },
          { label: "2x2", value: "2x2" },
          { label: "3x3", value: "3x3" },
          { label: "4x4", value: "4x4" }
        );

      const criarBtn = new ButtonBuilder()
        .setCustomId("criar_fila_treino")
        .setLabel("Criar Fila")
        .setStyle(ButtonStyle.Primary);

      return interaction.reply({
        content: "🎮 Configure a fila de treino:",
        components: [
          new ActionRowBuilder().addComponents(modoMenu),
          new ActionRowBuilder().addComponents(criarBtn)
        ]
      });
    }
  }

  // =====================================================
  // ================= MENUS =============================
  // =====================================================

  if (interaction.isStringSelectMenu()) {

    if (interaction.customId === "modo_pago") {
      configuracoesTemp.set(interaction.user.id, {
        modo: interaction.values[0]
      });
      return interaction.deferUpdate();
    }

    if (interaction.customId === "modo_treino") {
      configuracoesTemp.set(interaction.user.id, {
        modo: interaction.values[0]
      });
      return interaction.deferUpdate();
    }
  }

  // =====================================================
  // ================= BOTÕES ============================
  // =====================================================

  if (interaction.isButton()) {

    // ===== CRIAR PARTIDA PAGA =====
    if (interaction.customId === "criar_partida_paga") {

      const data = configuracoesTemp.get(interaction.user.id);
      if (!data?.modo)
        return interaction.reply({ content: "⚠️ Selecione o modo!", ephemeral: true });

      const modal = new ModalBuilder()
        .setCustomId("valor_modal")
        .setTitle("Valor da Partida");

      const valorInput = new TextInputBuilder()
        .setCustomId("valor_input")
        .setLabel("Digite o valor por jogador")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(valorInput));

      return interaction.showModal(modal);
    }

    // ===== CRIAR FILA TREINO =====
    if (interaction.customId === "criar_fila_treino") {

      const data = configuracoesTemp.get(interaction.user.id);
      if (!data?.modo)
        return interaction.reply({ content: "⚠️ Selecione o modo!", ephemeral: true });

      const filaId = Date.now().toString();

      filasTreino.set(filaId, {
        modo: data.modo,
        jogadores: [],
        max: MODOS[data.modo]
      });

      const entrar = new ButtonBuilder()
        .setCustomId(`entrar_${filaId}`)
        .setLabel("Entrar")
        .setStyle(ButtonStyle.Success);

      await interaction.channel.send({
        content: gerarMensagemFila(filasTreino.get(filaId)),
        components: [new ActionRowBuilder().addComponents(entrar)]
      });

      return interaction.reply({ content: "✅ Fila criada!", ephemeral: true });
    }

    // ===== ENTRAR FILA TREINO =====
    if (interaction.customId.startsWith("entrar_")) {

      const filaId = interaction.customId.split("_")[1];
      const fila = filasTreino.get(filaId);
      if (!fila) return;

      if (fila.jogadores.includes(interaction.user.id))
        return interaction.reply({ content: "Você já está na fila!", ephemeral: true });

      fila.jogadores.push(interaction.user.id);

      await interaction.update({
        content: gerarMensagemFila(fila),
        components: interaction.message.components
      });

      if (fila.jogadores.length === fila.max) {

        const categoria = interaction.guild.channels.cache.find(
          c => c.name.toLowerCase() === "rush treino" &&
          c.type === ChannelType.GuildCategory
        );

        if (!categoria) return;

        const canal = await interaction.guild.channels.create({
          name: `treino-${fila.modo}`,
          type: ChannelType.GuildText,
          parent: categoria.id,
          permissionOverwrites: [
            { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
            ...fila.jogadores.map(id => ({
              id,
              allow: [PermissionFlagsBits.ViewChannel]
            }))
          ]
        });

        await canal.send("🎮 Treino iniciado!");

        filasTreino.set(filaId, {
          modo: fila.modo,
          jogadores: [],
          max: fila.max
        });
      }
    }
  }

  // =====================================================
  // ================= MODAL =============================
  // =====================================================

  if (interaction.isModalSubmit()) {

    if (interaction.customId === "valor_modal") {

      const valor = interaction.fields.getTextInputValue("valor_input");
      const data = configuracoesTemp.get(interaction.user.id);

      const embed = new EmbedBuilder()
        .setTitle("💰 Partida Paga")
        .setDescription(`
Modo: ${data.modo}
Valor: R$${valor}
PIX: ${PIX}
        `)
        .setColor("Green");

      return interaction.reply({ embeds: [embed] });
    }
  }
});

// ================= FUNÇÃO FILA =================
function gerarMensagemFila(fila) {
  const lista = fila.jogadores.map((id, i) =>
    `${i + 1}. <@${id}>`
  ).join("\n");

  return `🎮 **Fila ${fila.modo}**
(${fila.jogadores.length}/${fila.max})

${lista || "Vazio"}`;
}

client.login(TOKEN);
