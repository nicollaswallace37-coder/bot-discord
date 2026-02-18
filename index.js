const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');
const express = require('express');

// ===== SERVIDOR PARA O RENDER =====
const app = express();
const PORT = process.env.PORT;

app.get('/', (req, res) => {
  res.send('Bot online');
});

app.listen(PORT, () => {
  console.log('Servidor rodando na porta ' + PORT);
});
// ===================================


// ===== CONFIG DO DISCORD =====
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// ===== COMANDO =====
const comando = new SlashCommandBuilder()
  .setName('ping')
  .setDescription('Responde com Pong!');

client.once('ready', async () => {
  console.log(`Bot logado como ${client.user.tag}`);

  const rest = new REST({ version: '10' }).setToken(TOKEN);

  try {
    await rest.put(
      Routes.applicationCommands(CLIENT_ID),
      { body: [comando.toJSON()] }
    );

    console.log('Comando registrado com sucesso!');
  } catch (err) {
    console.error(err);
  }
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'ping') {
    await interaction.reply('Pong!');
  }
});

client.login(TOKEN);
