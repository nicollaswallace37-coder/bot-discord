require('dotenv').config();
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ChannelType,
  PermissionsBitField
} = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

const filas = new Map();
let configTemp = {};

client.once('ready', () => {
  console.log(`✅ Logado como ${client.user.tag}`);
});

client.on('interactionCreate', async (interaction) => {

  if (interaction.isChatInputCommand()) {

    if (interaction.commandName === 'fila') {

      const tipoMenu = new StringSelectMenuBuilder()
        .setCustomId('select_tipo')
        .setPlaceholder('Selecione o Tipo')
        .addOptions(
          { label: 'Mobile', value: 'Mobile' },
          { label: 'Emulador', value: 'Emulador' },
          { label: 'Misto', value: 'Misto' },
          { label: 'Tático', value: 'Tático' },
          { label: 'Full Soco', value: 'Full Soco' }
        );

      const modoMenu = new StringSelectMenuBuilder()
        .setCustomId('select_modo')
        .setPlaceholder('Selecione o Modo')
        .addOptions(
          { label: '1x1', value: '1' },
          { label: '2x2', value: '2' },
          { label: '3x3', value: '3' },
          { label: '4x4', value: '4' }
        );

      const criar = new ButtonBuilder()
        .setCustomId('criar_fila')
        .setLabel('Criar Fila')
        .setStyle(ButtonStyle.Success);

      const preco = new ButtonBuilder()
        .setCustomId('definir_preco')
        .setLabel('Definir Preço')
        .setStyle(ButtonStyle.Primary);

      await interaction.reply({
        content: 'Configure sua fila:',
        components: [
          new ActionRowBuilder().addComponents(tipoMenu),
          new ActionRowBuilder().addComponents(modoMenu),
          new ActionRowBuilder().addComponents(preco, criar)
        ],
        ephemeral: true
      });
    }
  }

  if (interaction.isStringSelectMenu()) {

    if (interaction.customId === 'select_tipo') {
      configTemp.tipo = interaction.values[0];
      await interaction.reply({ content: `Tipo definido: ${configTemp.tipo}`, ephemeral: true });
    }

    if (interaction.customId === 'select_modo') {
      configTemp.modo = interaction.values[0];
      await interaction.reply({ content: `Modo definido: ${configTemp.modo}x${configTemp.modo}`, ephemeral: true });
    }
  }

  if (interaction.isButton()) {

    if (interaction.customId === 'definir_preco') {
      configTemp.precos = ['0,20']; // pode expandir depois
      return interaction.reply({ content: 'Preço definido como 0,20 (padrão).', ephemeral: true });
    }

    if (interaction.customId === 'criar_fila') {

      if (!configTemp.tipo || !configTemp.modo || !configTemp.precos) {
        return interaction.reply({ content: 'Configure tudo antes.', ephemeral: true });
      }

      const filaId = Date.now().toString();

      filas.set(filaId, {
        tipo: configTemp.tipo,
        modo: parseInt(configTemp.modo),
        precos: configTemp.precos,
        jogadores: []
      });

      const embed = new EmbedBuilder()
        .setTitle('🔥 Fila Aberta')
        .addFields(
          { name: 'Tipo', value: configTemp.tipo, inline: true },
          { name: 'Modo', value: `${configTemp.modo}x${configTemp.modo}`, inline: true },
          { name: 'Preço', value: configTemp.precos.join('\n') },
          { name: 'Jogadores (0)', value: 'Nenhum ainda.' }
        )
        .setColor('Green');

      const entrar = new ButtonBuilder()
        .setCustomId(`entrar_${filaId}`)
        .setLabel('Entrar')
        .setStyle(ButtonStyle.Primary);

      const sair = new ButtonBuilder()
        .setCustomId(`sair_${filaId}`)
        .setLabel('Sair')
        .setStyle(ButtonStyle.Danger);

      await interaction.channel.send({
        embeds: [embed],
        components: [new ActionRowBuilder().addComponents(entrar, sair)]
      });

      return interaction.reply({ content: 'Fila criada com sucesso!', ephemeral: true });
    }

    // ENTRAR
    if (interaction.customId.startsWith('entrar_')) {

      const filaId = interaction.customId.split('_')[1];
      const fila = filas.get(filaId);

      if (!fila) return interaction.reply({ content: 'Fila não encontrada.', ephemeral: true });

      if (fila.jogadores.includes(interaction.user.id)) {
        return interaction.reply({ content: 'Você já está na fila.', ephemeral: true });
      }

      fila.jogadores.push(interaction.user.id);

      atualizarEmbed(interaction, filaId);

      await interaction.reply({ content: 'Você entrou na fila!', ephemeral: true });

      if (fila.jogadores.length >= fila.modo * 2) {
        criarSalaPrivada(interaction.guild, fila);
      }
    }

    // SAIR
    if (interaction.customId.startsWith('sair_')) {

      const filaId = interaction.customId.split('_')[1];
      const fila = filas.get(filaId);

      if (!fila) return;

      fila.jogadores = fila.jogadores.filter(id => id !== interaction.user.id);

      atualizarEmbed(interaction, filaId);

      return interaction.reply({ content: 'Você saiu da fila.', ephemeral: true });
    }
  }
});

async function atualizarEmbed(interaction, filaId) {
  const fila = filas.get(filaId);
  const mensagem = await interaction.message.fetch();

  const nomes = fila.jogadores.map(id => `<@${id}>`).join('\n') || 'Nenhum ainda.';

  const embed = EmbedBuilder.from(mensagem.embeds[0])
    .spliceFields(3, 1, {
      name: `Jogadores (${fila.jogadores.length})`,
      value: nomes
    });

  await mensagem.edit({ embeds: [embed] });
}

async function criarSalaPrivada(guild, fila) {

  const mediadorRole = guild.roles.cache.find(r => r.name === 'Mediador');

  const canal = await guild.channels.create({
    name: `fila-${Date.now()}`,
    type: ChannelType.GuildText,
    permissionOverwrites: [
      { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
      ...fila.jogadores.map(id => ({
        id,
        allow: [PermissionsBitField.Flags.ViewChannel]
      })),
      mediadorRole ? {
        id: mediadorRole.id,
        allow: [PermissionsBitField.Flags.ViewChannel]
      } : null
    ].filter(Boolean)
  });

  const encerrar = new ButtonBuilder()
    .setCustomId('encerrar_atendimento')
    .setLabel('Encerrar Atendimento')
    .setStyle(ButtonStyle.Danger);

  await canal.send({
    content: 'Sala criada.',
    components: [new ActionRowBuilder().addComponents(encerrar)]
  });
}

client.login(process.env.TOKEN);
