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

/**************** SELECT ****************/

if (interaction.isStringSelectMenu()) {

/* NORMAL TIPO */
if (interaction.customId === "normal_tipo") {

configTemp.set(interaction.user.id,{
sistema:"normal",
tipo:interaction.values[0],
canal:interaction.channel.id
});

const modoMenu = new StringSelectMenuBuilder()
.setCustomId("normal_modo")
.setPlaceholder("Escolha o modo")
.addOptions(MODOS.map(m=>({label:m,value:m})));

return interaction.update({
content:"🎮 Escolha o modo:",
components:[new ActionRowBuilder().addComponents(modoMenu)]
});
}

/* NORMAL MODO */
if (interaction.customId === "normal_modo") {

const config = configTemp.get(interaction.user.id);
config.modo = interaction.values[0];

return interaction.reply({
content:"Digite os valores separados por vírgula.\nEx: 10,20,30",
ephemeral:true
});
}

/* TREINO TIPO */
if (interaction.customId === "treino_tipo") {

configTemp.set(interaction.user.id,{
sistema:"treino",
tipo:interaction.values[0],
canal:interaction.channel.id
});

const modoMenu = new StringSelectMenuBuilder()
.setCustomId("treino_modo")
.setPlaceholder("Escolha o modo")
.addOptions(MODOS.map(m=>({label:m,value:m})));

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
content: gerarMensagemTreino(fila),
components:[new ActionRowBuilder().addComponents(entrar,sair)]
});

fila.mensagem = msg;

configTemp.delete(interaction.user.id);

return interaction.reply({content:"Fila treino criada.",ephemeral:true});
}

}

/**************** BOTÕES ****************/

if (interaction.isButton()) {

/* ENTRAR NORMAL */
if (interaction.customId.startsWith("entrar_normal_")) {

const id = interaction.customId.replace("entrar_normal_","");
const fila = filasNormal.get(id);
if(!fila) return interaction.deferUpdate();

if(!fila.jogadores.includes(interaction.user.id))
fila.jogadores.push(interaction.user.id);

await interaction.deferUpdate();
await fila.mensagem.edit({content: gerarMensagemNormal(fila)});

if(fila.jogadores.length===fila.max)
await fecharNormal(interaction.guild,fila);

return;
}

/* SAIR NORMAL */
if (interaction.customId.startsWith("sair_normal_")) {

const id = interaction.customId.replace("sair_normal_","");
const fila = filasNormal.get(id);
if(!fila) return interaction.deferUpdate();

fila.jogadores = fila.jogadores.filter(x=>x!==interaction.user.id);

await interaction.deferUpdate();
await fila.mensagem.edit({content: gerarMensagemNormal(fila)});
return;
}

/* ENTRAR TREINO */
if (interaction.customId.startsWith("entrar_treino_")) {

const id = interaction.customId.replace("entrar_treino_","");
const fila = filasTreino.get(id);
if(!fila) return interaction.deferUpdate();

if(!fila.jogadores.includes(interaction.user.id))
fila.jogadores.push(interaction.user.id);

await interaction.deferUpdate();
await fila.mensagem.edit({content: gerarMensagemTreino(fila)});

if(fila.jogadores.length===fila.max)
await fecharTreino(interaction.guild,fila);

return;
}

/* SAIR TREINO */
if (interaction.customId.startsWith("sair_treino_")) {

const id = interaction.customId.replace("sair_treino_","");
const fila = filasTreino.get(id);
if(!fila) return interaction.deferUpdate();

fila.jogadores = fila.jogadores.filter(x=>x!==interaction.user.id);

await interaction.deferUpdate();
await fila.mensagem.edit({content: gerarMensagemTreino(fila)});
return;
}

}

} catch(err){ console.log(err); }
});

/**************** NORMAL MESSAGE ****************/

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
modo:config.modo,
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

const sair=new ButtonBuilder()
.setCustomId(`sair_normal_${id}`)
.setLabel("Sair")
.setStyle(ButtonStyle.Danger);

const msg=await message.channel.send({
content: gerarMensagemNormal(fila),
components:[new ActionRowBuilder().addComponents(entrar,sair)]
});

fila.mensagem=msg;
}

configTemp.delete(message.author.id);
});

/**************** FUNÇÕES ****************/

function listarJogadores(lista){
if(lista.length===0) return "Nenhum jogador ainda.";
return lista.map(id=>`<@${id}>`).join("\n");
}

function gerarMensagemNormal(fila){
return `💰 Fila ${fila.tipo}
🎮 Modo: ${fila.modo}
💵 Valor: R$${fila.valor}

👥 Jogadores:
${listarJogadores(fila.jogadores)}

Vagas: ${fila.jogadores.length}/${fila.max}`;
}

function gerarMensagemTreino(fila){
return `🎯 Treino ${fila.tipo}
🎮 Modo: ${fila.modo}

👥 Jogadores:
${listarJogadores(fila.jogadores)}

Vagas: ${fila.jogadores.length}/${fila.max}`;
}

async function fecharNormal(guild,fila){

const categoria=guild.channels.cache.find(c=>c.name.toLowerCase()==="rush");
if(!categoria) return;

await guild.channels.create({
name:`${fila.tipo}-${fila.valor}`,
type:ChannelType.GuildText,
parent:categoria.id
});

fila.jogadores=[];
await fila.mensagem.edit({content: gerarMensagemNormal(fila)});
}

async function fecharTreino(guild,fila){

const categoria=guild.channels.cache.find(c=>c.name.toLowerCase()==="rush treino");
if(!categoria) return;

await guild.channels.create({
name:`${fila.tipo}-${fila.modo}`,
type:ChannelType.GuildText,
parent:categoria.id
});

fila.jogadores=[];
await fila.mensagem.edit({content: gerarMensagemTreino(fila)});
}

client.login(TOKEN);
