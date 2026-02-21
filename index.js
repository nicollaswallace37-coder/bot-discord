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
Routes
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

/* ================= COMANDOS ================= */

if (interaction.isChatInputCommand()) {

/* NORMAL */
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

/* TREINO */
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

/* ================= SELECT ================= */

if (interaction.isStringSelectMenu()) {

/* NORMAL TIPO */
if (interaction.customId === "normal_tipo") {

configTemp.set(interaction.user.id,{
sistema:"normal",
tipo:interaction.values[0],
canal:interaction.channel.id
});

return interaction.reply({
content:"Digite os valores separados por vírgula.\nEx: 10,20,30",
ephemeral:true
});
}

/* TREINO TIPO */
if (interaction.customId === "treino_tipo") {

const modoMenu = new StringSelectMenuBuilder()
.setCustomId("treino_modo")
.setPlaceholder("Escolha o modo")
.addOptions(
{ label:"Mobile", value:"Mobile"},
{ label:"Emu", value:"Emu"},
{ label:"Misto", value:"Misto"},
{ label:"Tático", value:"Tático"},
{ label:"Full Soco", value:"Full Soco"}
);

configTemp.set(interaction.user.id,{
sistema:"treino",
tipo:interaction.values[0],
canal:interaction.channel.id
});

return interaction.update({
content:"🎯 Escolha o modo:",
components:[new ActionRowBuilder().addComponents(modoMenu)]
});
}

/* TREINO MODO */
if (interaction.customId === "treino_modo") {

const config = configTemp.get(interaction.user.id);
config.modo = interaction.values[0];

const id = Date.now().toString();

const fila = {
id,
tipo:config.tipo,
modo:config.modo,
jogadores:[],
max:TIPOS[config.tipo],
mensagem:null
};

filasTreino.set(id,fila);

const entrar = new ButtonBuilder()
.setCustomId(`entrar_treino_${id}`)
.setLabel("Entrar")
.setStyle(ButtonStyle.Success);

const sair = new ButtonBuilder()
.setCustomId(`sair_treino_${id}`)
.setLabel("Sair")
.setStyle(ButtonStyle.Danger);

const msg = await interaction.channel.send({
content:gerarMensagemTreino(fila),
components:[new ActionRowBuilder().addComponents(entrar,sair)]
});

fila.mensagem = msg;

configTemp.delete(interaction.user.id);

return interaction.reply({content:"Fila treino criada.",ephemeral:true});
}

}

/* ================= BOTÕES ================= */

if (interaction.isButton()) {

/* NORMAL */
if (interaction.customId.startsWith("entrar_normal_")) {

const id = interaction.customId.replace("entrar_normal_","");
const fila = filasNormal.get(id);
if(!fila) return interaction.deferUpdate();

if(fila.jogadores.includes(interaction.user.id))
return interaction.reply({content:"Já está na fila.",ephemeral:true});

fila.jogadores.push(interaction.user.id);

await interaction.deferUpdate();
await fila.mensagem.edit({content:gerarMensagemNormal(fila)});

if(fila.jogadores.length===fila.max)
await fecharNormal(interaction.guild,fila);

return;
}

/* TREINO */
if (interaction.customId.startsWith("entrar_treino_")) {

const id = interaction.customId.replace("entrar_treino_","");
const fila = filasTreino.get(id);
if(!fila) return interaction.deferUpdate();

if(fila.jogadores.includes(interaction.user.id))
return interaction.reply({content:"Já está na fila.",ephemeral:true});

fila.jogadores.push(interaction.user.id);

await interaction.deferUpdate();
await fila.mensagem.edit({content:gerarMensagemTreino(fila)});

if(fila.jogadores.length===fila.max)
await fecharTreino(interaction.guild,fila);

return;
}

}

} catch(err){ console.log(err); }
});

/**************** MESSAGE NORMAL ****************/

client.on("messageCreate", async (message)=>{

if(message.author.bot) return;
if(!configTemp.has(message.author.id)) return;

const config = configTemp.get(message.author.id);
if(config.sistema!=="normal") return;
if(message.channel.id!==config.canal) return;

const valores = message.content.split(",").map(v=>parseFloat(v.trim()));

for(const valor of valores){

const id = Date.now().toString()+Math.random();
const fila={
id,
tipo:config.tipo,
valor,
jogadores:[],
max:TIPOS[config.tipo],
mensagem:null
};

filasNormal.set(id,fila);

const entrar=new ButtonBuilder()
.setCustomId(`entrar_normal_${id}`)
.setLabel("Entrar")
.setStyle(ButtonStyle.Success);

const msg=await message.channel.send({
content:gerarMensagemNormal(fila),
components:[new ActionRowBuilder().addComponents(entrar)]
});

fila.mensagem=msg;
}

configTemp.delete(message.author.id);
});

/**************** FUNÇÕES ****************/

function gerarMensagemNormal(fila){
return `💰 Fila ${fila.tipo}
Valor: R$${fila.valor}

Vagas: ${fila.jogadores.length}/${fila.max}`;
}

function gerarMensagemTreino(fila){
return `🎯 Treino ${fila.tipo}
Modo: ${fila.modo}

Vagas: ${fila.jogadores.length}/${fila.max}`;
}

async function fecharNormal(guild,fila){

const categoria=guild.channels.cache
.find(c=>c.name.toLowerCase()==="rush");

if(!categoria) return;

await guild.channels.create({
name:`${fila.tipo}-${fila.valor}`,
type:ChannelType.GuildText,
parent:categoria.id
});

fila.jogadores=[];
await fila.mensagem.edit({content:gerarMensagemNormal(fila)});
}

async function fecharTreino(guild,fila){

const categoria=guild.channels.cache
.find(c=>c.name.toLowerCase()==="rush treino");

if(!categoria) return;

await guild.channels.create({
name:`${fila.tipo}-${fila.modo}`,
type:ChannelType.GuildText,
parent:categoria.id
});

fila.jogadores=[];
await fila.mensagem.edit({content:gerarMensagemTreino(fila)});
}

client.login(TOKEN);
