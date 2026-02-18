const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, Collection } = require('discord.js');

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.commands = new Collection();

// ===== COMANDO /fila =====
const filaCommand = new SlashCommandBuilder()
  .setName('fila')
  .setDescription('Gerencia a fila')
  .addSubcommand(sub =>
    sub
      .setName('criar')
      .setDescription('Cria uma nova fila')
  )
  .addSubcommand(sub =>
    sub
      .setName('entrar')
      .setDescription('Entrar na fila')
  )
  .addSubcommand(sub =>
    sub
      .setName('sair')
      .setDescription('Sair da fila')
  );

client.commands.set(filaCommand.name, filaCommand);

const filas = {};

// ===== REGISTRAR COMANDO =====
client.once('ready', async () => {
  const rest = new REST({ version: '10' }).setToken(TOKEN);

  try {
    console.log('Registrando comando...');

    await rest.put(
      Routes.applicationCommands(CLIENT_ID),
      { body: [filaCommand.toJSON()] }
    );

    console.log('Comando registrado com sucesso!');
    console.log(`Bot ligado como ${client.user.tag}`);
  } catch (error) {
    console.error(error);
  }
});

// ===== INTERAÇÃO =====
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'fila') {

    const sub = interaction.options.getSubcommand();

    if (sub === 'criar') {
      if (filas[interaction.guildId]) {
        return interaction.reply({ content: 'Já existe uma fila criada!', ephemeral: true });
      }

      filas[interaction.guildId] = [];
      return interaction.reply('Fila criada com sucesso!');
    }

    if (sub === 'entrar') {
      if (!filas[interaction.guildId]) {
        return interaction.reply({ content: 'Nenhuma fila foi criada ainda!', ephemeral: true });
      }

      if (filas[interaction.guildId].includes(interaction.user.id)) {
        return interaction.reply({ content: 'Você já está na fila!', ephemeral: true });
      }

      filas[interaction.guildId].push(interaction.user.id);

      return interaction.reply(`Você entrou na fila! Posição: ${filas[interaction.guildId].length}`);
    }

    if (sub === 'sair') {
      if (!filas[interaction.guildId]) {
        return interaction.reply({ content: 'Nenhuma fila foi criada ainda!', ephemeral: true });
      }

      const index = filas[interaction.guildId].indexOf(interaction.user.id);

      if (index === -1) {
        return interaction.reply({ content: 'Você não está na fila!', ephemeral: true });
      }

      filas[interaction.guildId].splice(index, 1);

      return interaction.reply('Você saiu da fila!');
    }
  }
});

client.login(TOKEN);
