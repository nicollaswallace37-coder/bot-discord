const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  REST,
  Routes,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} = require('discord.js');

require('dotenv').config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const commands = [
  new SlashCommandBuilder()
    .setName('criar-fila')
    .setDescription('Cria o painel de fila')
].map(command => command.toJSON());

client.once('ready', async () => {
  console.log(✅ Logado como ${client.user.tag});

  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

  try {
    await rest.put(
      Routes.applicationGuildCommands(
        client.user.id,
        '1473169041890742347'
      ),
      { body: commands },
    );

    console.log('✅ Comando /criar-fila registrado!');
  } catch (error) {
    console.error(error);
  }
});

client.on('interactionCreate', async interaction => {

  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === 'criar-fila') {

      const embed = new EmbedBuilder()
        .setTitle('📋 Sistema de Fila')
        .setDescription('Clique no botão abaixo para entrar na fila.')
        .setColor(0x00AEFF);

      const button = new ButtonBuilder()
        .setCustomId('entrar_fila')
        .setLabel('Entrar na Fila')
        .setStyle(ButtonStyle.Primary);

      const row = new ActionRowBuilder().addComponents(button);

      await interaction.reply({
        embeds: [embed],
        components: [row]
      });
    }
  }

  if (interaction.isButton()) {
    if (interaction.customId === 'entrar_fila') {
      await interaction.reply({
        content: '✅ Você entrou na fila!',
        ephemeral: true
      });
    }
  }

});

client.login(process.env.TOKEN);
