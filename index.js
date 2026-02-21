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
ModalBuilder,
TextInputBuilder,
TextInputStyle,
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

const CPF_PIX = "45055362898";
const TIPOS = { "1x1":2, "2x2":4, "3x3":6, "4x4":8 };
const MODOS = ["Mobile","Emu","Misto","Tático","Full Soco"];

const filasNormal = new Map();
const filasTreino = new Map();

/**************** SLASH ****************/
const commands = [
{ name:"painel", description:"Criar fila normal" },
{ name:"fila-treino", description:"Criar fila treino" }
];

const rest = new REST({ version:"10" }).setToken(TOKEN);
(async()=>{
await rest.put(
Routes.applicationGuildCommands(CLIENT_ID,GUILD_ID),
{ body:commands }
);
})();

client.once("ready",()=>{
console.log("Bot online ✅");
});

/**************** INTERAÇÕES ****************/

client.on("interactionCreate", async interaction => {
try {

/* ================= SLASH ================= */

if(interaction.isChatInputCommand()){

if(interaction.commandName==="painel"){
const menu = new StringSelectMenuBuilder()
.setCustomId("normal_tipo")
.setPlaceholder("Escolha o tipo")
.addOptions(
{label:"1x1",value:"1x1"},
{label:"2x2",value:"2x2"},
{label:"3x3",value:"3x3"},
{label:"4x4",value:"4x4"}
);

return interaction.reply({
content:"🎮 Escolha o tipo:",
components:[new ActionRowBuilder().addComponents(menu)],
ephemeral:true
});
}

if(interaction.commandName==="fila-treino"){
const menu = new StringSelectMenuBuilder()
.setCustomId("treino_tipo")
.setPlaceholder("Escolha o tipo")
.addOptions(
{label:"1x1",value:"1x1"},
{label:"2x2",value:"2x2"},
{label:"3x3",value:"3x3"},
{label:"4x4",value:"4x4"}
);

return interaction.reply({
content:"🎯 Treino - escolha o tipo:",
components:[new ActionRowBuilder().addComponents(menu)],
ephemeral:true
});
}

}

/* ================= SELECT ================= */

if(interaction.isStringSelectMenu()){

if(interaction.customId==="normal_tipo"){
const tipo = interaction.values[0];

const modoMenu = new StringSelectMenuBuilder()
.setCustomId(`normal_modo_${tipo}`)
.setPlaceholder("Escolha o modo")
.addOptions(MODOS.map(m=>({label:m,value:m})));

return interaction.update({
content:`Tipo: ${tipo}\nEscolha o modo:`,
components:[new ActionRowBuilder().addComponents(modoMenu)]
});
}

if(interaction.customId.startsWith("normal_modo_")){
const tipo = interaction.customId.split("_")[2];
const modo = interaction.values[0];

const modal = new ModalBuilder()
.setCustomId(`modal_valor_${tipo}_${modo}`)
.setTitle("Valor da Partida");

modal.addComponents(
new ActionRowBuilder().addComponents(
new TextInputBuilder()
.setCustomId("valor")
.setLabel("Digite o valor (apenas número)")
.setStyle(TextInputStyle.Short)
.setRequired(true)
)
);

return interaction.showModal(modal);
}

if(interaction.customId==="treino_tipo"){
const tipo = interaction.values[0];

const modoMenu = new StringSelectMenuBuilder()
.setCustomId(`treino_modo_${tipo}`)
.setPlaceholder("Escolha o modo")
.addOptions(MODOS.map(m=>({label:m,value:m})));

return interaction.update({
content:`Tipo: ${tipo}\nEscolha o modo:`,
components:[new ActionRowBuilder().addComponents(modoMenu)]
});
}

if(interaction.customId.startsWith("treino_modo_")){
const tipo = interaction.customId.split("_")[2];
const modo = interaction.values[0];

const fila = {
tipo,modo,
jogadores:[],
max:TIPOS[tipo]
};

const mensagem = await interaction.channel.send({
content: gerarTreino(fila),
components: gerarBotoes()
});

fila.mensagem = mensagem;
filasTreino.set(mensagem.id,fila);

return interaction.update({content:"Fila treino criada!",components:[]});
}

}

/* ================= MODAL ================= */

if(interaction.isModalSubmit()){

if(interaction.customId.startsWith("modal_valor_")){

const partes = interaction.customId.split("_");
const tipo = partes[2];
const modo = partes[3];

const valor = Number(interaction.fields.getTextInputValue("valor"));
if(isNaN(valor))
return interaction.reply({content:"Valor inválido.",ephemeral:true});

const fila = {
tipo,modo,valor,
jogadores:[],
max:TIPOS[tipo]
};

const mensagem = await interaction.channel.send({
content: gerarNormal(fila),
components: gerarBotoes()
});

fila.mensagem = mensagem;
filasNormal.set(mensagem.id,fila);

return interaction.reply({content:"Fila criada!",ephemeral:true});
}

}

/* ================= BOTÕES ================= */

if(interaction.isButton()){

if(interaction.customId==="encerrar"){
if(!interaction.member.roles.cache.some(r=>r.name==="Mediador"))
return interaction.reply({content:"Apenas Mediador pode encerrar.",ephemeral:true});
return interaction.channel.delete();
}

if(interaction.customId.startsWith("confirmar_")){
const modal = new ModalBuilder()
.setCustomId("modal_sala")
.setTitle("Configurar Sala");

modal.addComponents(
new ActionRowBuilder().addComponents(
new TextInputBuilder()
.setCustomId("codigo")
.setLabel("Código da sala")
.setStyle(TextInputStyle.Short)
),
new ActionRowBuilder().addComponents(
new TextInputBuilder()
.setCustomId("senha")
.setLabel("Senha da sala")
.setStyle(TextInputStyle.Short)
)
);

return interaction.showModal(modal);
}

const fila = filasNormal.get(interaction.message.id) || filasTreino.get(interaction.message.id);
if(!fila) return;

if(interaction.customId==="entrar"){
if(!fila.jogadores.includes(interaction.user.id))
fila.jogadores.push(interaction.user.id);
}

if(interaction.customId==="sair"){
fila.jogadores = fila.jogadores.filter(id=>id!==interaction.user.id);
}

await interaction.update({
content: fila.valor ? gerarNormal(fila) : gerarTreino(fila),
components: gerarBotoes()
});

if(fila.jogadores.length>=fila.max){
if(fila.valor) fecharNormal(interaction.guild,fila);
else fecharTreino(interaction.guild,fila);
}

}

}catch(e){console.log(e);}
});

/**************** FUNÇÕES ****************/

function gerarBotoes(){
return [new ActionRowBuilder().addComponents(
new ButtonBuilder().setCustomId("entrar").setLabel("Entrar").setStyle(ButtonStyle.Success),
new ButtonBuilder().setCustomId("sair").setLabel("Sair").setStyle(ButtonStyle.Danger)
)];
}

function gerarNormal(fila){
return `💰 Fila ${fila.tipo}
🎮 Modo: ${fila.modo}
💵 Valor: R$${fila.valor}

👥 Jogadores:
${fila.jogadores.map(id=>`<@${id}>`).join("\n")||"Nenhum"}

Vagas: ${fila.jogadores.length}/${fila.max}`;
}

function gerarTreino(fila){
return `🎯 Treino ${fila.tipo}
🎮 Modo: ${fila.modo}

👥 Jogadores:
${fila.jogadores.map(id=>`<@${id}>`).join("\n")||"Nenhum"}

Vagas: ${fila.jogadores.length}/${fila.max}`;
}

async function fecharNormal(guild,fila){
const categoria = guild.channels.cache.find(c=>c.name==="rush");
if(!categoria) return;

const valorFinal = (fila.valor*1.10).toFixed(2);

const canal = await guild.channels.create({
name:`${fila.tipo}-${fila.valor}`,
type:ChannelType.GuildText,
parent:categoria.id,
permissionOverwrites:[
{ id:guild.roles.everyone, deny:[PermissionFlagsBits.ViewChannel] },
...fila.jogadores.map(id=>({
id,allow:[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.SendMessages]
}))
]
});

await canal.send(`💰 Valor com taxa: R$${valorFinal}
🏦 Pix do Mediador:
${CPF_PIX}`);

await canal.send({
components:[new ActionRowBuilder().addComponents(
new ButtonBuilder().setCustomId("confirmar_normal").setLabel("Confirmar").setStyle(ButtonStyle.Success),
new ButtonBuilder().setCustomId("encerrar").setLabel("Encerrar").setStyle(ButtonStyle.Danger)
)]
});
}

async function fecharTreino(guild,fila){
const categoria = guild.channels.cache.find(c=>c.name==="rush treino");
if(!categoria) return;

const canal = await guild.channels.create({
name:`${fila.tipo}-${fila.modo}`,
type:ChannelType.GuildText,
parent:categoria.id,
permissionOverwrites:[
{ id:guild.roles.everyone, deny:[PermissionFlagsBits.ViewChannel] },
...fila.jogadores.map(id=>({
id,allow:[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.SendMessages]
}))
]
});

await canal.send(`🎯 Treino iniciado!

Terminando o treino aperte em encerrar chat.
Bom treino 🔥`);

await canal.send({
components:[new ActionRowBuilder().addComponents(
new ButtonBuilder().setCustomId("confirmar_treino").setLabel("Confirmar").setStyle(ButtonStyle.Success),
new ButtonBuilder().setCustomId("encerrar").setLabel("Encerrar").setStyle(ButtonStyle.Danger)
)]
});
}

client.login(TOKEN);
