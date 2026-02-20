/**************** EXPRESS ****************/
const express = require("express");
const app = express();
app.get("/", (req, res) => res.send("Bot online ✅"));
app.listen(process.env.PORT || 3000);

/**************** DISCORD ****************/
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
Routes
} = require("discord.js");

const client = new Client({
intents: [
GatewayIntentBits.Guilds,
GatewayIntentBits.GuildMessages,
GatewayIntentBits.MessageContent,
GatewayIntentBits.GuildMembers
]
});

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
const PIX = "450.553.628.98";

/****************************************************************/
/*********************** CONFIG *********************************/
/****************************************************************/

const MODOS = { "1x1": 2, "2x2": 4, "3x3": 6, "4x4": 8 };

/****************************************************************/
/*********************** FILA NORMAL ****************************/
/****************************************************************/

const filas = {};
const filasTemp = {};
const partidasAtivas = {};

function calcularTaxa(valor) {
const numero = parseFloat(valor);
if (numero <= 0.70) return numero + 0.20;
return numero + numero * 0.20;
}

/****************************************************************/
/*********************** FILA TREINO ****************************/
/****************************************************************/

const filasTreino = new Map();
const configTempTreino = new Map();

/****************************************************************/
/*********************** SLASH *********************************/
/****************************************************************/

const commands = [
{
name: "painel",
description: "Abrir painel"
},
{
name: "fila-treino",
description: "Criar fila treino"
}
];

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
await rest.put(
Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
{ body: commands }
);
})();

client.once("ready", () => {
console.log(`✅ Bot online como ${client.user.tag}`);
});

/****************************************************************/
/*********************** INTERAÇÕES *****************************/
/****************************************************************/

client.on("interactionCreate", async (interaction) => {
try {

/**************** COMANDO PAINEL (NORMAL) ****************/
if (interaction.isChatInputCommand() && interaction.commandName === "painel") {

const row = new ActionRowBuilder().addComponents(
new StringSelectMenuBuilder()
.setCustomId("modo_select_normal")
.setPlaceholder("Escolha o modo")
.addOptions(
{ label: "1x1", value: "1x1" },
{ label: "2x2", value: "2x2" },
{ label: "3x3", value: "3x3" },
{ label: "4x4", value: "4x4" }
)
);

return interaction.reply({
content: "Escolha o modo:",
components: [row],
ephemeral: true
});
}

/**************** COMANDO FILA TREINO ****************/
if (interaction.isChatInputCommand() && interaction.commandName === "fila-treino") {

const modoMenu = new StringSelectMenuBuilder()
.setCustomId("modo_select_treino")
.setPlaceholder("Selecione o modo")
.addOptions(
{ label: "1x1", value: "1x1" },
{ label: "2x2", value: "2x2" },
{ label: "3x3", value: "3x3" },
{ label: "4x4", value: "4x4" }
);

const tipoMenu = new StringSelectMenuBuilder()
.setCustomId("tipo_select_treino")
.setPlaceholder("Selecione o tipo")
.addOptions(
{ label: "Mobile", value: "Mobile" },
{ label: "Emu", value: "Emu" },
{ label: "Misto", value: "Misto" },
{ label: "Tático", value: "Tático" },
{ label: "Full Soco", value: "Full Soco" }
);

const criarBtn = new ButtonBuilder()
.setCustomId("criar_fila_treino")
.setLabel("Criar Fila")
.setStyle(ButtonStyle.Success);

return interaction.reply({
content: "🎮 Configure a fila:",
components: [
new ActionRowBuilder().addComponents(modoMenu),
new ActionRowBuilder().addComponents(tipoMenu),
new ActionRowBuilder().addComponents(criarBtn)
]
});
}

/**************** SELECT NORMAL ****************/
if (interaction.isStringSelectMenu()) {

if (interaction.customId === "modo_select_normal") {

const modo = interaction.values[0];

const row = new ActionRowBuilder().addComponents(
new StringSelectMenuBuilder()
.setCustomId(`tipo_normal_${modo}`)
.setPlaceholder("Escolha o tipo")
.addOptions(
{ label: "mobile", value: "mobile" },
{ label: "emu", value: "emu" },
{ label: "misto", value: "misto" },
{ label: "tatico", value: "tatico" },
{ label: "full soco", value: "full soco" }
)
);

return interaction.update({
content: "Escolha o tipo:",
components: [row]
});
}

if (interaction.customId.startsWith("tipo_normal_")) {

const modo = interaction.customId.replace("tipo_normal_", "");
const tipo = interaction.values[0];

filasTemp[interaction.user.id] = { modo, tipo };

return interaction.update({
content: "Digite os valores separados por vírgula (ex: 1,2,5)",
components: []
});
}

/**************** SELECT TREINO ****************/

if (!configTempTreino.has(interaction.user.id))
configTempTreino.set(interaction.user.id, {});

const data = configTempTreino.get(interaction.user.id);

if (interaction.customId === "modo_select_treino")
data.modo = interaction.values[0];

if (interaction.customId === "tipo_select_treino")
data.tipo = interaction.values[0];

configTempTreino.set(interaction.user.id, data);
return interaction.deferUpdate();
}

/**************** BOTÕES ****************/
if (interaction.isButton()) {

/************** CRIAR FILA TREINO **************/
if (interaction.customId === "criar_fila_treino") {

const data = configTempTreino.get(interaction.user.id);
if (!data?.modo || !data?.tipo)
return interaction.reply({ content: "⚠️ Selecione modo e tipo!", ephemeral: true });

const filaId = Date.now().toString();

filasTreino.set(filaId, {
modo: data.modo,
tipo: data.tipo,
jogadores: [],
max: MODOS[data.modo]
});

const entrar = new ButtonBuilder()
.setCustomId(`entrar_treino_${filaId}`)
.setLabel("Entrar")
.setStyle(ButtonStyle.Primary);

const sair = new ButtonBuilder()
.setCustomId(`sair_treino_${filaId}`)
.setLabel("Sair")
.setStyle(ButtonStyle.Danger);

await interaction.channel.send({
content: gerarMensagemTreino(filasTreino.get(filaId)),
components: [new ActionRowBuilder().addComponents(entrar, sair)]
});

return interaction.reply({ content: "✅ Fila criada!", ephemeral: true });
}

/************** ENTRAR TREINO **************/
if (interaction.customId.startsWith("entrar_treino_")) {

const filaId = interaction.customId.split("_")[2];
const fila = filasTreino.get(filaId);
if (!fila) return;

if (fila.jogadores.includes(interaction.user.id))
return interaction.reply({ content: "Você já está na fila!", ephemeral: true });

fila.jogadores.push(interaction.user.id);

await interaction.update({
content: gerarMensagemTreino(fila),
components: interaction.message.components
});

if (fila.jogadores.length === fila.max) {
await criarCanalTreino(interaction.guild, fila);
fila.jogadores = [];
await interaction.message.edit({
content: gerarMensagemTreino(fila),
components: interaction.message.components
});
}
}

/************** SAIR TREINO **************/
if (interaction.customId.startsWith("sair_treino_")) {

const filaId = interaction.customId.split("_")[2];
const fila = filasTreino.get(filaId);
if (!fila) return;

fila.jogadores = fila.jogadores.filter(id => id !== interaction.user.id);

await interaction.update({
content: gerarMensagemTreino(fila),
components: interaction.message.components
});
}

/************** ENCERRAR TREINO **************/
if (interaction.customId.startsWith("encerrar_treino_")) {
return interaction.channel.delete();
}

/************** CONFIRMAR NORMAL **************/
if (interaction.customId === "confirmar_pagamento") {

const mediador = partidasAtivas[interaction.channel.id];
if (interaction.user.id !== mediador)
return interaction.reply({ content: "Apenas o mediador pode usar.", ephemeral: true });

const modal = new ModalBuilder()
.setCustomId("modal_sala")
.setTitle("Lançar Sala");

modal.addComponents(
new ActionRowBuilder().addComponents(
new TextInputBuilder()
.setCustomId("codigo")
.setLabel("Código da Sala")
.setStyle(TextInputStyle.Short)
),
new ActionRowBuilder().addComponents(
new TextInputBuilder()
.setCustomId("senha")
.setLabel("Senha da Sala")
.setStyle(TextInputStyle.Short)
)
);

return interaction.showModal(modal);
}

/************** ENCERRAR NORMAL **************/
if (interaction.customId === "encerrar_chat") {

const mediador = partidasAtivas[interaction.channel.id];
if (interaction.user.id !== mediador)
return interaction.reply({ content: "Apenas o mediador pode encerrar.", ephemeral: true });

delete partidasAtivas[interaction.channel.id];
return interaction.channel.delete();
}

}

} catch (err) {
console.log(err);
}
});

/****************************************************************/
/*********************** MENSAGEM NORMAL ************************/
/****************************************************************/

client.on("messageCreate", async (message) => {

if (message.author.bot) return;

const dados = filasTemp[message.author.id];
if (!dados) return;

const valores = message.content.split(",").map(v => v.trim());
delete filasTemp[message.author.id];

for (const valor of valores) {

const key = `${dados.modo}_${dados.tipo}_${valor}`;

filas[key] = {
modo: dados.modo,
tipo: dados.tipo,
preco: valor,
jogadores: [],
mediador: message.author.id
};

await criarMensagemFila(message.channel, key);
}

await message.delete().catch(() => {});
});

/****************************************************************/
/*********************** FUNÇÕES ********************************/
/****************************************************************/

function gerarMensagemTreino(fila) {
const lista = fila.jogadores
.map((id, i) => `${i + 1}. <@${id}>`)
.join("\n");

return `🎮 Fila - ${fila.modo} | ${fila.tipo}

Jogadores:
${lista || "Vazio"}`;
}

async function criarCanalTreino(guild, fila) {

const categoria = guild.channels.cache.find(
c => c.name.toLowerCase() === "rush treino" && c.type === ChannelType.GuildCategory
);
if (!categoria) return;

const canal = await guild.channels.create({
name: `treino-${fila.modo}-${fila.tipo}`.toLowerCase(),
type: ChannelType.GuildText,
parent: categoria.id,
permissionOverwrites: [
{ id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
...fila.jogadores.map(id => ({
id,
allow: [PermissionFlagsBits.ViewChannel]
}))
]
});

const encerrar = new ButtonBuilder()
.setCustomId(`encerrar_treino_${canal.id}`)
.setLabel("Encerrar Treino")
.setStyle(ButtonStyle.Danger);

await canal.send({
content: "🎮 Treino iniciado!\n\nBom treino 💪",
components: [new ActionRowBuilder().addComponents(encerrar)]
});
}

async function criarMensagemFila(channel, key) {

const fila = filas[key];

const embed = new EmbedBuilder()
.setTitle(`Fila ${fila.modo}`)
.setDescription(`Tipo: ${fila.tipo}
Valor: R$ ${fila.preco}

Jogadores (0/${MODOS[fila.modo]})`);

const row = new ActionRowBuilder().addComponents(
new ButtonBuilder()
.setCustomId(`entrar_${key}`)
.setLabel("Entrar")
.setStyle(ButtonStyle.Success),
new ButtonBuilder()
.setCustomId(`sair_${key}`)
.setLabel("Sair")
.setStyle(ButtonStyle.Secondary)
);

await channel.send({ embeds: [embed], components: [row] });
}

client.login(TOKEN);
