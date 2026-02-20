const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits,
  SlashCommandBuilder,
  REST,
  Routes,
  InteractionType
} = require("discord.js")

const TOKEN = process.env.TOKEN
const CLIENT_ID = process.env.CLIENT_ID
const GUILD_ID = process.env.GUILD_ID

if (!TOKEN || !CLIENT_ID || !GUILD_ID) {
  console.log("Variáveis TOKEN, CLIENT_ID ou GUILD_ID não definidas.")
  process.exit(1)
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
})

const filas = {}


// ================= REGISTRAR COMANDOS =================

const commands = [

  new SlashCommandBuilder()
    .setName("painel")
    .setDescription("Abrir painel fila normal")
    .addStringOption(option =>
      option.setName("modo")
        .setDescription("Modo")
        .setRequired(true)
        .addChoices(
          { name: "1x1", value: "1x1" },
          { name: "2x2", value: "2x2" }
        )
    )
    .addStringOption(option =>
      option.setName("tipo")
        .setDescription("Tipo")
        .setRequired(true)
        .addChoices(
          { name: "cash", value: "cash" },
          { name: "x1", value: "x1" }
        )
    )
    .addStringOption(option =>
      option.setName("valores")
        .setDescription("Até 15 valores separados por vírgula")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("fila-treino")
    .setDescription("Abrir fila de treino")
    .addStringOption(option =>
      option.setName("modo")
        .setDescription("Modo treino")
        .setRequired(true)
        .addChoices(
          { name: "1x1", value: "1x1" },
          { name: "2x2", value: "2x2" }
        )
    )

].map(c => c.toJSON())

const rest = new REST({ version: "10" }).setToken(TOKEN)

async function registerCommands() {
  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  )
  console.log("Comandos registrados.")
}

client.once("ready", async () => {
  console.log(`Logado como ${client.user.tag}`)
  await registerCommands()
})


// ================= INTERAÇÕES =================

client.on("interactionCreate", async interaction => {

  if (
    interaction.type !== InteractionType.ApplicationCommand &&
    interaction.type !== InteractionType.MessageComponent
  ) return


  // ===== PAINEL NORMAL =====

  if (interaction.isChatInputCommand() && interaction.commandName === "painel") {

    const modo = interaction.options.getString("modo")
    const tipo = interaction.options.getString("tipo")
    const valoresInput = interaction.options.getString("valores")

    const valores = valoresInput
      .split(",")
      .map(v => v.trim())
      .filter(v => v.length > 0)

    if (valores.length === 0 || valores.length > 15) {
      return interaction.reply({
        content: "Coloque entre 1 e 15 valores.",
        ephemeral: true
      })
    }

    const filaID = Date.now().toString()

    filas[filaID] = {
      modo,
      tipo,
      jogadores: []
    }

    const row = new ActionRowBuilder()

    valores.forEach(valor => {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`entrar_${filaID}_${valor}`)
          .setLabel(`R$ ${valor}`)
          .setStyle(ButtonStyle.Primary)
      )
    })

    await interaction.reply({
      content: `🎮 fila ${modo} | ${tipo}\nEscolha o valor:`,
      components: [row]
    })
  }


  // ===== FILA TREINO =====

  if (interaction.isChatInputCommand() && interaction.commandName === "fila-treino") {

    const modo = interaction.options.getString("modo")

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`treino_${modo}`)
        .setLabel("Entrar na fila de treino")
        .setStyle(ButtonStyle.Success)
    )

    await interaction.reply({
      content: `🏆 fila treino ${modo}`,
      components: [row]
    })
  }


  // ===== BOTÕES =====

  if (interaction.isButton()) {

    // ===== FILA NORMAL =====

    if (interaction.customId.startsWith("entrar_")) {

      const [, filaID, valor] = interaction.customId.split("_")
      const fila = filas[filaID]
      if (!fila) return

      if (fila.jogadores.includes(interaction.user.id)) {
        return interaction.reply({ content: "Você já entrou.", ephemeral: true })
      }

      fila.jogadores.push(interaction.user.id)

      await interaction.reply({
        content: "Você entrou na fila.",
        ephemeral: true
      })

      if (fila.jogadores.length === 2) {

        const [j1, j2] = fila.jogadores

        const categoria = interaction.guild.channels.cache.find(
          c => c.name === "rush" && c.type === ChannelType.GuildCategory
        )

        if (!categoria) {
          return interaction.followUp({
            content: "Categoria 'rush' não encontrada.",
            ephemeral: true
          })
        }

        const canal = await interaction.guild.channels.create({
          name: `rush-${valor}`,
          type: ChannelType.GuildText,
          parent: categoria.id,
          permissionOverwrites: [
            {
              id: interaction.guild.roles.everyone,
              deny: [PermissionFlagsBits.ViewChannel]
            },
            { id: j1, allow: [PermissionFlagsBits.ViewChannel] },
            { id: j2, allow: [PermissionFlagsBits.ViewChannel] }
          ]
        })

        const encerrar = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`encerrar_${canal.id}_${j1}`)
            .setLabel("Encerrar")
            .setStyle(ButtonStyle.Danger)
        )

        await canal.send({
          content: `🎮 partida iniciada\n<@${j1}> vs <@${j2}>`,
          components: [encerrar]
        })

        // 🔥 substitui automaticamente
        fila.jogadores = []
      }
    }


    // ===== TREINO =====

    if (interaction.customId.startsWith("treino_")) {

      const modo = interaction.customId.split("_")[1]

      const categoria = interaction.guild.channels.cache.find(
        c => c.name === "rush treino" && c.type === ChannelType.GuildCategory
      )

      if (!categoria) {
        return interaction.reply({
          content: "Categoria 'rush treino' não encontrada.",
          ephemeral: true
        })
      }

      const canal = await interaction.guild.channels.create({
        name: `rush-treino-${modo}`,
        type: ChannelType.GuildText,
        parent: categoria.id,
        permissionOverwrites: [
          {
            id: interaction.guild.roles.everyone,
            deny: [PermissionFlagsBits.ViewChannel]
          },
          {
            id: interaction.user.id,
            allow: [PermissionFlagsBits.ViewChannel]
          }
        ]
      })

      const encerrar = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("encerrar_treino")
          .setLabel("Encerrar treino")
          .setStyle(ButtonStyle.Danger)
      )

      await canal.send({
        content: `🏆 treino iniciado para <@${interaction.user.id}>`,
        components: [encerrar]
      })

      await interaction.reply({
        content: `Canal criado: ${canal}`,
        ephemeral: true
      })
    }


    // ===== ENCERRAR NORMAL =====

    if (interaction.customId.startsWith("encerrar_")) {

      const [, canalID, donoID] = interaction.customId.split("_")

      if (interaction.user.id !== donoID) {
        return interaction.reply({
          content: "Só quem iniciou pode encerrar.",
          ephemeral: true
        })
      }

      const canal = interaction.guild.channels.cache.get(canalID)
      if (canal) await canal.delete()
    }

    // ===== ENCERRAR TREINO =====

    if (interaction.customId === "encerrar_treino") {
      await interaction.channel.delete()
    }
  }
})

client.login(TOKEN)
