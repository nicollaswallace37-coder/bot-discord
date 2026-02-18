const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.once('ready', () => {
  console.log(✅ Bot online como ${client.user.tag});
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  try {
    if (interaction.commandName === 'teste') {
      await interaction.deferReply();
      await interaction.editReply('✅ Está funcionando!');
    }
  } catch (error) {
    console.error(error);

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp('❌ Deu erro ao executar o comando.');
    } else {
      await interaction.reply('❌ Deu erro ao executar o comando.');
    }
  }
});

client.login(process.env.TOKEN);
