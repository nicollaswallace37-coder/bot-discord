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

const MEDIADOR_ID = "1467036179386990593";
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

/**************** SLASH ****************/

if (interaction.isChatInputCommand()) {

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

/* NORMAL */
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

if (interaction.customId === "normal_modo") {

const config = configTemp.get(interaction.user.id);
config.modo = interaction.values[0];

return interaction.reply({
content:"Digite os valores separados por vírgula.\nEx: 10,20,30",
ephemeral:true
});
}

/* TREINO */
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

/* ENTRAR TREINO */
if (interaction.customId.startsWith("entrar_treino_")) {

const id = interaction.customId.replace("entrar_treino_","");
const fila = filasTreino.get(id);
if(!fila) return interaction.deferUpdate();

if(!fila.jogadores.includes(interaction.user.id))
fila.jogadores.push(interaction.user.id);

await interaction.deferUpdate();
await fila.mensagem.edit({content: gerarMensagemTreino(fila)});
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

/* CONFIRMAR */
if(interaction.customId.startsWith("confirmar_")){

if(interaction.user.id !== MEDIADOR_ID)
return interaction.reply({content:"Apenas o mediador pode usar.",ephemeral:true});

const filaId = interaction.customId.replace("confirmar_","");
const modal = new ModalBuilder()
.setCustomId(`modal_${filaId}`)
.setTitle("Configurar Sala");

modal.addComponents(
new ActionRowBuilder().addComponents(
new TextInputBuilder()
.setCustomId("codigo")
.setLabel("Código da Sala")
.setStyle(TextInputStyle.Short)
.setRequired(true)
),
new ActionRowBuilder().addComponents(
new TextInputBuilder()
.setCustomId("senha")
.setLabel("Senha da Sala")
.setStyle(TextInputStyle.Short)
.setRequired(true)
)
);

return interaction.showModal(modal);
}

/* ENCERRAR */
if(interaction.customId.startsWith("encerrar_")){

if(interaction.user.id !== MEDIADOR_ID)
return interaction.reply({content:"Apenas o mediador pode usar.",ephemeral:true});

await interaction.reply({content:"Encerrando partida...",ephemeral:true});
setTimeout(()=> interaction.channel.delete().catch(()=>{}),2000);
return;
}

}

/**************** MODAL ****************/

if(interaction.isModalSubmit()){

const filaId = interaction.customId.replace("modal_","");
const fila = filasNormal.get(filaId);
if(!fila) return;

const codigo = interaction.fields.getTextInputValue("codigo");
const senha = interaction.fields.getTextInputValue("senha");

const canal = interaction.guild.channels.cache.get(fila.canalPartida);

await canal.send(`
🎮 SALA LIBERADA

📌 Código: ${codigo}
🔑 Senha: ${senha}
`);

return interaction.reply({content:"Sala enviada no canal.",ephemeral:true});
}

} catch(err){ console.log(err); }
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

client.login(TOKEN);
