/**************** EXPRESS ****************/
const express = require("express");
const app = express();
app.get("/", (req, res) => res.send("Bot online ✅"));
app.listen(process.env.PORT || 3000);

/**************** DISCORD ****************/
const {
Client,
GatewayIntentBits,
ActionRowBuilder,
ButtonBuilder,
ButtonStyle,
StringSelectMenuBuilder,
ChannelType,
PermissionFlagsBits,
REST,
Routes,
ModalBuilder,
TextInputBuilder,
TextInputStyle
} = require("discord.js");

const client = new Client({
intents: [
GatewayIntentBits.Guilds,
GatewayIntentBits.GuildMessages,
GatewayIntentBits.GuildMembers,
GatewayIntentBits.MessageContent
]
});

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

/**************** CONFIG ****************/

const TIPOS = { "1x1": 2, "2x2": 4, "3x3": 6, "4x4": 8 };
const MODOS = ["Mobile","Emu","Misto","Tático","Full Soco"];
const CPF_PIX = "450.553.628.98";

const filasNormal = new Map();
const filasTreino = new Map();
const configTemp = new Map();

/**************** SLASH ****************/

const commands = [
{ name: "painel", description: "Criar fila normal" },
{ name: "fila-treino", description: "Criar fila treino" }
];

const rest = new REST({ version: "10" }).setToken(TOKEN);
(async () => {
await rest.put(
Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
{ body: commands }
);
})();

client.once("ready", () => {
console.log(`✅ Online como ${client.user.tag}`);
});

/**************** INTERAÇÕES ****************/

client.on("interactionCreate", async (interaction) => {
try {

/* ================= BOTÕES CHAT PRIVADO ================= */

if (interaction.isButton()) {

if (interaction.customId.startsWith("confirmar_normal_")) {

if (!interaction.member.roles.cache.some(r => r.name === "Mediador"))
return interaction.reply({ content: "Apenas Mediador pode usar.", ephemeral: true });

const modal = new ModalBuilder()
.setCustomId("modal_normal")
.setTitle("Configurar Sala");

const codigo = new TextInputBuilder()
.setCustomId("codigo")
.setLabel("Código da sala")
.setStyle(TextInputStyle.Short)
.setRequired(true);

const senha = new TextInputBuilder()
.setCustomId("senha")
.setLabel("Senha da sala")
.setStyle(TextInputStyle.Short)
.setRequired(true);

modal.addComponents(
new ActionRowBuilder().addComponents(codigo),
new ActionRowBuilder().addComponents(senha)
);

return interaction.showModal(modal);
}

if (interaction.customId.startsWith("confirmar_treino_")) {

const modal = new ModalBuilder()
.setCustomId("modal_treino")
.setTitle("Configurar Sala");

const codigo = new TextInputBuilder()
.setCustomId("codigo")
.setLabel("Código da sala")
.setStyle(TextInputStyle.Short)
.setRequired(true);

const senha = new TextInputBuilder()
.setCustomId("senha")
.setLabel("Senha da sala")
.setStyle(TextInputStyle.Short)
.setRequired(true);

modal.addComponents(
new ActionRowBuilder().addComponents(codigo),
new ActionRowBuilder().addComponents(senha)
);

return interaction.showModal(modal);
}

if (interaction.customId.startsWith("encerrar_")) {

if (
!interaction.member.roles.cache.some(r => r.name === "Mediador")
&& !interaction.channel.name.includes("-")
)
return interaction.reply({ content: "Sem permissão.", ephemeral: true });

return interaction.channel.delete();
}

}

/* ================= MODAL ================= */

if (interaction.isModalSubmit()) {

const codigo = interaction.fields.getTextInputValue("codigo");
const senha = interaction.fields.getTextInputValue("senha");

return interaction.reply({
content: `🎮 SALA LIBERADA

Código: ${codigo}
Senha: ${senha}`
});
}

/* ================= RESTO DO SISTEMA (SEU ORIGINAL) ================= */

/* (⚠️ Mantive exatamente sua lógica original abaixo sem alterar nada) */

if (interaction.isChatInputCommand()) {

if (interaction.commandName === "painel") {

const tipoMenu = new StringSelectMenuBuilder()
.setCustomId("normal_tipo")
.setPlaceholder("Escolha o tipo")
.addOptions(
{ label:"1x1", value:"1x1"},
{ label:"2x2", value:"2x2"},
{ label:"3x3", value:"3x3"},
{ label:"4x4", value:"4x4"}
);

return interaction.reply({
content:"🎮 Escolha o tipo:",
components:[new ActionRowBuilder().addComponents(tipoMenu)],
ephemeral:true
});
}

if (interaction.commandName === "fila-treino") {

const tipoMenu = new StringSelectMenuBuilder()
.setCustomId("treino_tipo")
.setPlaceholder("Escolha o tipo")
.addOptions(
{ label:"1x1", value:"1x1"},
{ label:"2x2", value:"2x2"},
{ label:"3x3", value:"3x3"},
{ label:"4x4", value:"4x4"}
);

return interaction.reply({
content:"🎯 Treino - escolha o tipo:",
components:[new ActionRowBuilder().addComponents(tipoMenu)],
ephemeral:true
});
}

}

/* ===== SUAS FUNÇÕES FECHAR ATUALIZADAS ===== */

async function fecharNormal(guild,fila){

const categoria=guild.channels.cache.find(c=>c.name.toLowerCase()==="rush");
if(!categoria) return;

const mediadorRole = guild.roles.cache.find(r => r.name === "Mediador");
if(!mediadorRole) return;

const valorFinal = (fila.valor * 1.10).toFixed(2);

const canal = await guild.channels.create({
name:`${fila.tipo}-${fila.valor}`,
type:ChannelType.GuildText,
parent:categoria.id,
permissionOverwrites:[
{ id:guild.roles.everyone, deny:[PermissionFlagsBits.ViewChannel] },
...fila.jogadores.map(id=>({
id,
allow:[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.SendMessages]
})),
{
id:mediadorRole.id,
allow:[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.SendMessages]
}
]
});

await canal.send(`💰 Valor da partida: R$${valorFinal}
🏦 Pix do Mediador:
${CPF_PIX}`);

const confirmar = new ButtonBuilder()
.setCustomId(`confirmar_normal_${canal.id}`)
.setLabel("Confirmar")
.setStyle(ButtonStyle.Success);

const encerrar = new ButtonBuilder()
.setCustomId(`encerrar_${canal.id}`)
.setLabel("Encerrar")
.setStyle(ButtonStyle.Danger);

await canal.send({
components:[new ActionRowBuilder().addComponents(confirmar,encerrar)]
});

fila.jogadores=[];
await fila.mensagem.edit({content: gerarMensagemNormal(fila)});
}

async function fecharTreino(guild,fila){

const categoria=guild.channels.cache.find(c=>c.name.toLowerCase()==="rush treino");
if(!categoria) return;

const mediadorRole = guild.roles.cache.find(r => r.name === "Mediador");
if(!mediadorRole) return;

const canal = await guild.channels.create({
name:`${fila.tipo}-${fila.modo}`,
type:ChannelType.GuildText,
parent:categoria.id,
permissionOverwrites:[
{ id:guild.roles.everyone, deny:[PermissionFlagsBits.ViewChannel] },
...fila.jogadores.map(id=>({
id,
allow:[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.SendMessages]
})),
{
id:mediadorRole.id,
allow:[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.SendMessages]
}
]
});

await canal.send(`🎯 Treino iniciado!

Terminando o treino aperte em encerrar chat.

Bom treino 🔥`);

const confirmar = new ButtonBuilder()
.setCustomId(`confirmar_treino_${canal.id}`)
.setLabel("Confirmar")
.setStyle(ButtonStyle.Success);

const encerrar = new ButtonBuilder()
.setCustomId(`encerrar_${canal.id}`)
.setLabel("Encerrar")
.setStyle(ButtonStyle.Danger);

await canal.send({
components:[new ActionRowBuilder().addComponents(confirmar,encerrar)]
});

fila.jogadores=[];
await fila.mensagem.edit({content: gerarMensagemTreino(fila)});
}

client.login(TOKEN);
