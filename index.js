const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  PermissionsBitField,
  ChannelType
} = require('discord.js');

const express = require('express');
const app = express();
const PORT = process.env.PORT || 10000;

app.get('/', (req, res) => {
  res.send('Bot online');
});

app.listen(PORT, () => {
  console.log('Servidor rodando na porta ' + PORT);
});

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const filas = new Map();

function limitePorModo(modo) {
  return {
    "1x1": 2,
    "2x2": 4,
    "3x3": 6,
    "4x4": 8
  }[modo];
}

const comando = new SlashCommandBuilder()
  .setName('painel')
  .setDescription('Abrir painel de criação de fila');

client.once('ready', async () => {
  console.log(`Bot logado como ${client.user.tag}`);

  const rest = new REST({ version: '10' }).setToken(TOKEN);

  await rest.put(
    Routes.applicationCommands(CLIENT_ID),
    { body: [comando.toJSON()] }
  );

  console.log('Comando registrado com sucesso!');
});

client.on('interactionCreate', async interaction => {

  // SLASH
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === 'painel') {

      filas.set(interaction.channel.id, {
        tipo: null,
        modo: null,
        precos: [],
        jogadores: []
      });

      const embed = new EmbedBuilder()
        .setTitle('🎛 Configuração da Fila')
        .setDescription('Configure abaixo e depois clique em Criar Fila.')
        .setColor('Blue');

      const tipoMenu = new StringSelectMenuBuilder()
        .setCustomId('config_tipo')
        .setPlaceholder('Selecione o Tipo')
        .addOptions([
          { label: 'Mobile', value: 'Mobile' },
          { label: 'Emu', value: 'Emu' },
          { label: 'Misto', value: 'Misto' },
          { label: 'Tático', value: 'Tático' },
          { label: 'Full Soco', value: 'Full Soco' },
        ]);

      const modoMenu = new StringSelectMenuBuilder()
        .setCustomId('config_modo')
        .setPlaceholder('Selecione o Modo')
        .addOptions([
          { label: '1x1', value: '1x1' },
          { label: '2x2', value: '2x2' },
          { label: '3x3', value: '3x3' },
          { label: '4x4', value: '4x4' },
        ]);

      const precoBtn = new ButtonBuilder()
        .setCustomId('config_preco')
        .setLabel('Definir Preços')
        .setStyle(ButtonStyle.Secondary);

      const criarBtn = new ButtonBuilder()
        .setCustomId('criar_fila')
        .setLabel('Criar Fila')
        .setStyle(ButtonStyle.Success);

      return interaction.reply({
        embeds: [embed],
        components: [
          new ActionRowBuilder().addComponents(tipoMenu),
          new ActionRowBuilder().addComponents(modoMenu),
          new ActionRowBuilder().addComponents(precoBtn),
          new ActionRowBuilder().addComponents(criarBtn)
        ]
      });
    }
  }

  // SELECT
  if (interaction.isStringSelectMenu()) {
    const fila = filas.get(interaction.channel.id);
    if (!fila) return;

    await interaction.deferReply({ ephemeral: true });

    if (interaction.customId === 'config_tipo') {
      fila.tipo = interaction.values[0];
      return interaction.editReply(`Tipo definido: ${fila.tipo}`);
    }

    if (interaction.customId === 'config_modo') {
      fila.modo = interaction.values[0];
      return interaction.editReply(`Modo definido: ${fila.modo}`);
    }
  }

  // BUTTON
  if (interaction.isButton()) {

    if (interaction.customId === 'encerrar_partida') {
      if (!interaction.member.roles.cache.some(r => r.name === "mediador")) {
        return interaction.reply({ content: 'Apenas mediador pode encerrar.', ephemeral: true });
      }
      return interaction.channel.delete();
    }

    const fila = filas.get(interaction.channel.id);
    if (!fila) return;

    // DEFINIR PREÇO
    if (interaction.customId === 'config_preco') {
      const modal = new ModalBuilder()
        .setCustomId('modal_preco')
        .setTitle('Definir Preços');

      const input = new TextInputBuilder()
        .setCustomId('precos_input')
        .setLabel('Separe por ; Ex: 0,20;2,50;10')
        .setStyle(TextInputStyle.Paragraph);

      modal.addComponents(new ActionRowBuilder().addComponents(input));
      return interaction.showModal(modal);
    }

    await interaction.deferReply({ ephemeral: true });

    // CRIAR FILA
    if (interaction.customId === 'criar_fila') {

      if (!fila.tipo || !fila.modo || fila.precos.length === 0) {
        return interaction.editReply('Configure tudo antes.');
      }

      const embed = new EmbedBuilder()
        .setTitle('🔥 Fila Aberta')
        .addFields(
          { name: 'Tipo', value: fila.tipo, inline: true },
          { name: 'Modo', value: fila.modo, inline: true },
          { name: 'Preços', value: fila.precos.join('\n') }
        )
        .setColor('Green');

      const entrar = new ButtonBuilder()
        .setCustomId('entrar_fila')
        .setLabel('Entrar')
        .setStyle(ButtonStyle.Primary);

      const sair = new ButtonBuilder()
        .setCustomId('sair_fila')
        .setLabel('Sair')
        .setStyle(ButtonStyle.Danger);

      await interaction.channel.send({
        embeds: [embed],
        components: [new ActionRowBuilder().addComponents(entrar, sair)]
      });

      return interaction.editReply('Fila criada com sucesso!');
    }
  }

  // MODAL
  if (interaction.isModalSubmit()) {
    if (interaction.customId === 'modal_preco') {

      await interaction.deferReply({ ephemeral: true });

      const fila = filas.get(interaction.channel.id);
      if (!fila) return;

      const valores = interaction.fields.getTextInputValue('precos_input');
      fila.precos = valores.split(/[;]+/).map(v => v.trim()).filter(v => v);

      return interaction.editReply('Preços definidos!');
    }
  }

});

client.login(TOKEN);
