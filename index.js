const {
Client,
GatewayIntentBits,
ActionRowBuilder,
ButtonBuilder,
ButtonStyle,
StringSelectMenuBuilder,
ChannelType,
PermissionFlagsBits,
Events
} = require('discord.js');

const client = new Client({
intents: [
GatewayIntentBits.Guilds,
GatewayIntentBits.GuildMembers
]
});

const filas = new Map();

const MODOS = {
"1x1": 2,
"2x2": 4,
"3x3": 6,
"4x4": 8
};

client.once('ready', () => {
console.log(✅ Bot online como ${client.user.tag});
});

client.on(Events.InteractionCreate, async interaction => {

// ===== COMANDO /fila-treino =====
if (interaction.isChatInputCommand()) {
if (interaction.commandName === 'fila-treino') {

const modoMenu = new StringSelectMenuBuilder()  
    .setCustomId('modo_select')  
    .setPlaceholder('Selecione o modo')  
    .addOptions(  
      { label: '1x1', value: '1x1' },  
      { label: '2x2', value: '2x2' },  
      { label: '3x3', value: '3x3' },  
      { label: '4x4', value: '4x4' }  
    );  

  const tipoMenu = new StringSelectMenuBuilder()  
    .setCustomId('tipo_select')  
    .setPlaceholder('Selecione o tipo')  
    .addOptions(  
      { label: 'Mobile', value: 'Mobile' },  
      { label: 'Emu', value: 'Emu' },  
      { label: 'Misto', value: 'Misto' },  
      { label: 'Tático', value: 'Tático' },  
      { label: 'Full Soco', value: 'Full Soco' }  
    );  

  const criarBtn = new ButtonBuilder()  
    .setCustomId('criar_fila')  
    .setLabel('Criar Fila')  
    .setStyle(ButtonStyle.Success);  

  await interaction.reply({  
    content: "🎮 Configure a fila:",  
    components: [  
      new ActionRowBuilder().addComponents(modoMenu),  
      new ActionRowBuilder().addComponents(tipoMenu),  
      new ActionRowBuilder().addComponents(criarBtn)  
    ]  
  });  
}

}

// ===== SELEÇÃO MODO/TIPO =====
if (interaction.isStringSelectMenu()) {

if (!filas.has(interaction.user.id)) {  
  filas.set(interaction.user.id, {});  
}  

const data = filas.get(interaction.user.id);  

if (interaction.customId === 'modo_select') {  
  data.modo = interaction.values[0];  
}  

if (interaction.customId === 'tipo_select') {  
  data.tipo = interaction.values[0];  
}  

filas.set(interaction.user.id, data);  
await interaction.deferUpdate();

}

// ===== BOTÕES =====
if (interaction.isButton()) {

// ===== CRIAR FILA =====  
if (interaction.customId === 'criar_fila') {  

  const data = filas.get(interaction.user.id);  
  if (!data?.modo || !data?.tipo)  
    return interaction.reply({ content: "⚠️ Selecione modo e tipo!", ephemeral: true });  

  const filaId = Date.now().toString();  

  filas.set(filaId, {  
    modo: data.modo,  
    tipo: data.tipo,  
    jogadores: [],  
    max: MODOS[data.modo]  
  });  

  const entrar = new ButtonBuilder()  
    .setCustomId(`entrar_${filaId}`)  
    .setLabel('Entrar')  
    .setStyle(ButtonStyle.Primary);  

  const sair = new ButtonBuilder()  
    .setCustomId(`sair_${filaId}`)  
    .setLabel('Sair')  
    .setStyle(ButtonStyle.Danger);  

  await interaction.channel.send({  
    content: gerarMensagemFila(filas.get(filaId)),  
    components: [  
      new ActionRowBuilder().addComponents(entrar, sair)  
    ]  
  });  

  await interaction.reply({ content: "✅ Fila criada!", ephemeral: true });  
}  

// ===== ENTRAR =====  
if (interaction.customId.startsWith("entrar_")) {  

  const filaId = interaction.customId.split("_")[1];  
  const fila = filas.get(filaId);  
  if (!fila) return;  

  if (fila.jogadores.includes(interaction.user.id))  
    return interaction.reply({ content: "Você já está na fila!", ephemeral: true });  

  if (fila.jogadores.length >= fila.max)  
    return interaction.reply({ content: "Fila cheia!", ephemeral: true });  

  fila.jogadores.push(interaction.user.id);  

  await interaction.update({  
    content: gerarMensagemFila(fila),  
    components: interaction.message.components  
  });  

  // ===== QUANDO LOTA =====  
  if (fila.jogadores.length === fila.max) {  

    const jogadoresCopia = [...fila.jogadores];  

    await criarCanalTreino(interaction.guild, {  
      modo: fila.modo,  
      tipo: fila.tipo,  
      jogadores: jogadoresCopia,  
      max: fila.max  
    });  

    // Zera automaticamente  
    fila.jogadores = [];  

    await interaction.message.edit({  
      content: gerarMensagemFila(fila),  
      components: interaction.message.components  
    });  
  }  
}  

// ===== SAIR =====  
if (interaction.customId.startsWith("sair_")) {  

  const filaId = interaction.customId.split("_")[1];  
  const fila = filas.get(filaId);  
  if (!fila) return;  

  fila.jogadores = fila.jogadores.filter(id => id !== interaction.user.id);  

  await interaction.update({  
    content: gerarMensagemFila(fila),  
    components: interaction.message.components  
  });  
}  

// ===== ENCERRAR TREINO =====  
if (interaction.customId.startsWith("encerrar_")) {  
  await interaction.channel.delete();  
}

}
});

// ===== MENSAGEM DA FILA =====
function gerarMensagemFila(fila) {
const lista = fila.jogadores
.map((id, i) => ${i + 1}. <@${id}>)
.join("\n");

return `🎮 Fila - ${fila.modo} | ${fila.tipo}

Jogadores:
${lista || "Vazio"}`;
}

// ===== CRIAR CANAL PRIVADO =====
async function criarCanalTreino(guild, fila) {

const categoria = guild.channels.cache.find(
c => c.name.toLowerCase() === "rush treino" && c.type === ChannelType.GuildCategory
);

if (!categoria) return;

const canal = await guild.channels.create({
name: treino-${fila.modo}-${fila.tipo}.toLowerCase(),
type: ChannelType.GuildText,
parent: categoria.id,
permissionOverwrites: [
{
id: guild.id,
deny: [PermissionFlagsBits.ViewChannel]
},
...fila.jogadores.map(id => ({
id,
allow: [PermissionFlagsBits.ViewChannel]
}))
]
});

const encerrar = new ButtonBuilder()
.setCustomId(encerrar_${canal.id})
.setLabel("Encerrar Treino")
.setStyle(ButtonStyle.Danger);

await canal.send({
content: `🎮 Treino iniciado!

Por favor, ao terminar clique em:
Bom treino 💪`,
components: [
new ActionRowBuilder().addComponents(encerrar)
]
});
}

client.login(process.env.TOKEN);
