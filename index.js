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
  const limites = {
    "1x1": 2,
    "2x2": 4,
    "3x3": 6,
    "4x4": 8
  };
  return limites[modo];
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

  // ================= SLASH =================
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

      const botaoPreco = new ButtonBuilder()
        .setCustomId('config_preco')
        .setLabel('Definir Preços')
        .setStyle(ButtonStyle.Secondary);

      const botaoCriar = new ButtonBuilder()
        .setCustomId('criar_fila')
        .setLabel('Criar Fila')
        .setStyle(ButtonStyle.Success);

      return interaction.reply({
        embeds: [embed],
        components: [
          new ActionRowBuilder().addComponents(tipoMenu),
          new ActionRowBuilder().addComponents(modoMenu),
          new ActionRowBuilder().addComponents(botaoPreco),
          new ActionRowBuilder().addComponents(botaoCriar)
        ]
      });
    }
  }

  // ================= SELECT =================
  if (interaction.isStringSelectMenu()) {

    const fila = filas.get(interaction.channel.id);
    if (!fila) return;

    if (interaction.customId === 'config_tipo') {
      fila.tipo = interaction.values[0];
      return interaction.reply({ content: `Tipo definido: ${fila.tipo}`, ephemeral: true });
    }

    if (interaction.customId === 'config_modo') {
      fila.modo = interaction.values[0];
      return interaction.reply({ content: `Modo definido: ${fila.modo}`, ephemeral: true });
    }
  }

  // ================= BUTTONS =================
  if (interaction.isButton()) {

    // BOTÃO ENCERRAR (não depende da fila do canal original)
    if (interaction.customId === 'encerrar_partida') {

      if (!interaction.member.roles.cache.some(r => r.name === "mediador")) {
        return interaction.reply({ content: 'Apenas mediador pode encerrar.', ephemeral: true });
      }

      return interaction.channel.delete();
    }

    const fila = filas.get(interaction.channel.id);
    if (!fila) {
      return interaction.reply({ content: 'Use /painel primeiro.', ephemeral: true });
    }

    // ===== DEFINIR PREÇO =====
    if (interaction.customId === 'config_preco') {

      const modal = new ModalBuilder()
        .setCustomId('modal_preco')
        .setTitle('Definir Preços');

      const input = new TextInputBuilder()
        .setCustomId('precos_input')
        .setLabel('Separe por ; Ex: 0,20;2,50;10')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(input));

      return interaction.showModal(modal);
    }

    // ===== CRIAR FILA =====
    if (interaction.customId === 'criar_fila') {

      if (!fila.tipo || !fila.modo || fila.precos.length === 0) {
        return interaction.reply({ content: 'Configure tudo antes.', ephemeral: true });
      }

      const embed = new EmbedBuilder()
        .setTitle('🔥 Fila Aberta')
        .addFields(
          { name: 'Tipo', value: fila.tipo, inline: true },
          { name: 'Modo', value: fila.modo, inline: true },
          { name: 'Preços', value: fila.precos.join('\n') },
          { name: 'Jogadores', value: 'Nenhum ainda.' }
        )
        .setColor('Green');

      const entrar = new ButtonBuilder()
        .setCustomId('entrar_fila')
        .setLabel('Entrar na Fila')
        .setStyle(ButtonStyle.Primary);

      return interaction.reply({
        embeds: [embed],
        components: [new ActionRowBuilder().addComponents(entrar)]
      });
    }

    // ===== ENTRAR NA FILA =====
    if (interaction.customId === 'entrar_fila') {

      if (fila.jogadores.includes(interaction.user.id)) {
        return interaction.reply({ content: 'Você já está na fila.', ephemeral: true });
      }

      fila.jogadores.push(interaction.user.id);

      await interaction.reply({ content: 'Você entrou na fila!', ephemeral: true });

      const limite = limitePorModo(fila.modo);

      if (fila.jogadores.length >= limite) {

        const participantes = fila.jogadores.splice(0, limite);

        const mediadorRole = interaction.guild.roles.cache.find(r => r.name === "mediador");
        if (!mediadorRole) return;

        const canal = await interaction.guild.channels.create({
          name: `partida-${Date.now()}`,
          type: ChannelType.GuildText,
          permissionOverwrites: [
            {
              id: interaction.guild.roles.everyone,
              deny: [PermissionsBitField.Flags.ViewChannel]
            },
            ...participantes.map(id => ({
              id,
              allow: [PermissionsBitField.Flags.ViewChannel]
            })),
            {
              id: mediadorRole.id,
              allow: [PermissionsBitField.Flags.ViewChannel]
            }
          ]
        });

        const embedPartida = new EmbedBuilder()
          .setTitle('🎮 Sala da Partida')
          .setDescription('Aguardando mediador encerrar.')
          .setColor('Red');

        const encerrar = new ButtonBuilder()
          .setCustomId('encerrar_partida')
          .setLabel('Encerrar')
          .setStyle(ButtonStyle.Danger);

        await canal.send({
          embeds: [embedPartida],
          components: [new ActionRowBuilder().addComponents(encerrar)]
        });
      }
    }
  }

  // ================= MODAL =================
  if (interaction.isModalSubmit()) {

    if (interaction.customId === 'modal_preco') {

      const fila = filas.get(interaction.channel.id);
      if (!fila) return;

      const valores = interaction.fields.getTextInputValue('precos_input');
      const lista = valores
        .split(/[;]+/)
        .map(v => v.trim())
        .filter(v => v);

      if (lista.length > 15) {
        return interaction.reply({ content: 'Máximo 15 valores.', ephemeral: true });
      }

      fila.precos = lista;

      return interaction.reply({ content: 'Preços definidos com sucesso!', ephemeral: true });
    }
  }

});

client.login(TOKEN);
