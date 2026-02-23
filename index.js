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
REST,
Routes,
SlashCommandBuilder
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

const filasNormal = new Map();
const filasTreino = new Map();
const configTemp = new Map();

/**************** SLASH COMMANDS ****************/

const commands = [
new SlashCommandBuilder().setName("painel").setDescription("Criar fila normal"),
new SlashCommandBuilder().setName("fila-treino").setDescription("Criar fila treino")
].map(cmd => cmd.toJSON());

client.once("ready", async () => {

console.log(`✅ Online como ${client.user.tag}`);

const rest = new REST({ version: "10" }).setToken(TOKEN);

await rest.put(
Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
{ body: commands }
);

console.log("✅ Slash commands registrados!");
});

/**************** INTERAÇÕES ****************/

client.on("interactionCreate", async (interaction) => {

try {

if (interaction.isChatInputCommand()) {

/* NORMAL */
if (interaction.commandName === "painel") {

const tipoMenu = new StringSelectMenuBuilder()
.setCustomId("normal_tipo")
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
.addOptions(MODOS.map(m=>({label:m,value:m})));

return interaction.update({
content:"🎮 Escolha o modo:",
components:[new ActionRowBuilder().addComponents(modoMenu)]
});
}

/* NORMAL MODO */
if (interaction.customId === "normal_modo") {

const config = configTemp.get(interaction.user.id);
if(!config)
return interaction.update({content:"Configuração expirada.",components:[]});

config.modo = interaction.values[0];

return interaction.update({
content:"Digite os valores separados por vírgula.\nEx: 10,20,30",
components:[]
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
.addOptions(MODOS.map(m=>({label:m,value:m})));

return interaction.update({
content:"🎯 Escolha o modo:",
components:[new ActionRowBuilder().addComponents(modoMenu)]
});
}

/* TREINO MODO */
if (interaction.customId === "treino_modo") {

const config = configTemp.get(interaction.user.id);
if(!config)
return interaction.update({content:"Configuração expirada.",components:[]});

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

return interaction.update({
content:"Fila treino criada com sucesso ✅",
components:[]
});
}

}

/**************** BOTÕES ****************/

if (interaction.isButton()) {

const isNormal = interaction.customId.startsWith("entrar_normal_") || interaction.customId.startsWith("sair_normal_");
const isTreino = interaction.customId.startsWith("entrar_treino_") || interaction.customId.startsWith("sair_treino_");

if(isNormal){

const id = interaction.customId.split("_")[2];
const fila = filasNormal.get(id);
if(!fila) return interaction.deferUpdate();

if(interaction.customId.startsWith("entrar")){
if(!fila.jogadores.includes(interaction.user.id))
fila.jogadores.push(interaction.user.id);
}else{
fila.jogadores = fila.jogadores.filter(x=>x!==interaction.user.id);
}

await interaction.deferUpdate();
await fila.mensagem.edit({content: gerarMensagemNormal(fila)});

if(fila.jogadores.length===fila.max)
await fecharNormal(interaction.guild,fila);

return;
}

if(isTreino){

const id = interaction.customId.split("_")[2];
const fila = filasTreino.get(id);
if(!fila) return interaction.deferUpdate();

if(interaction.customId.startsWith("entrar")){
if(!fila.jogadores.includes(interaction.user.id))
fila.jogadores.push(interaction.user.id);
}else{
fila.jogadores = fila.jogadores.filter(x=>x!==interaction.user.id);
}

await interaction.deferUpdate();
await fila.mensagem.edit({content: gerarMensagemTreino(fila)});

if(fila.jogadores.length===fila.max)
await fecharTreino(interaction.guild,fila);

return;
}

}

} catch(err){
console.log("ERRO:",err);
}
});
