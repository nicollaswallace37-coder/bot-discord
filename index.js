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

const MODOS = { "1x1": 2, "2x2": 4, "3x3": 6, "4x4": 8 };

const filasNormal = new Map();
const filasTreino = new Map();
const configTemp = new Map();

/**************** SLASH ****************/

const commands = [
{ name: "painel", description: "Abrir painel fila normal" },
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

/* COMANDOS */
if (interaction.isChatInputCommand()) {

/* PAINEL NORMAL */
if (interaction.commandName === "painel") {

const modo = new StringSelectMenuBuilder()
.setCustomId("normal_modo")
.setPlaceholder("Escolha o modo")
.addOptions(
{ label: "1x1", value: "1x1" },
{ label: "2x2", value: "2x2" },
{ label: "3x3", value: "3x3" },
{ label: "4x4", value: "4x4" }
);

return await interaction.reply({
content: "🎮 Escolha o modo:",
components: [new ActionRowBuilder().addComponents(modo)],
ephemeral: true
});
}

/* FILA TREINO */
if (interaction.commandName === "fila-treino") {

const modo = new StringSelectMenuBuilder()
.setCustomId("modo_treino")
.addOptions(
{ label: "1x1", value: "1x1" },
{ label: "2x2", value: "2x2" },
{ label: "3x3", value: "3x3" },
{ label: "4x4", value: "4x4" }
);

const tipo = new StringSelectMenuBuilder()
.setCustomId("tipo_treino")
.addOptions(
{ label: "Mobile", value: "Mobile" },
{ label: "Emu", value: "Emu" },
{ label: "Misto", value: "Misto" },
{ label: "Tático", value: "Tático" },
{ label: "Full Soco", value: "Full Soco" }
);

const btn = new ButtonBuilder()
.setCustomId("criar_treino")
.setLabel("Criar Fila")
.setStyle(ButtonStyle.Success);

return await interaction.reply({
content: "Configure a fila:",
components: [
new ActionRowBuilder().addComponents(modo),
new ActionRowBuilder().addComponents(tipo),
new ActionRowBuilder().addComponents(btn)
]
});
}
}

/* SELECT MENU */
if (interaction.isStringSelectMenu()) {

/* MODO NORMAL */
if (interaction.customId === "normal_modo") {

configTemp.set(interaction.user.id, { modo: interaction.values[0] });

const tipo = new StringSelectMenuBuilder()
.setCustomId("normal_tipo")
.addOptions(
{ label: "Mobile", value: "Mobile" },
{ label: "Emu", value: "Emu" },
{ label: "Misto", value: "Misto" },
{ label: "Tático", value: "Tático" },
{ label: "Full Soco", value: "Full Soco" }
);

return await interaction.update({
content: `Modo: ${interaction.values[0]}\n\nEscolha o tipo:`,
components: [new ActionRowBuilder().addComponents(tipo)]
});
}

/* TIPO NORMAL */
if (interaction.customId === "normal_tipo") {

const data = configTemp.get(interaction.user.id);
data.tipo = interaction.values[0];
data.aguardandoValor = true;

await interaction.update({
content: `Modo: ${data.modo}
Tipo: ${data.tipo}

💬 Digite o valor da fila agora (ex: 0.70)`,
components: []
});
}
}

/**************** CAPTURA VALOR DIGITADO ****************/

client.on("messageCreate", async (message) => {
if (message.author.bot) return;

const data = configTemp.get(message.author.id);
if (!data || !data.aguardandoValor) return;

const valor = message.content.replace(",", ".");
if (isNaN(valor)) return message.reply("Digite apenas números.");

data.valor = valor;
data.aguardandoValor = false;

const id = Date.now().toString();

filasNormal.set(id, {
modo: data.modo,
tipo: data.tipo,
valor: valor,
jogadores: [],
max: MODOS[data.modo]
});

const entrar = new ButtonBuilder()
.setCustomId(`entrar_normal_${id}`)
.setLabel("Entrar")
.setStyle(ButtonStyle.Success);

const sair = new ButtonBuilder()
.setCustomId(`sair_normal_${id}`)
.setLabel("Sair")
.setStyle(ButtonStyle.Danger);

await message.channel.send({
content: gerarMensagemNormal(filasNormal.get(id)),
components: [new ActionRowBuilder().addComponents(entrar, sair)]
});

message.reply("Fila criada com sucesso ✅");
});

/**************** BOTÕES ****************/

client.on("interactionCreate", async (interaction) => {
if (!interaction.isButton()) return;

if (interaction.customId.startsWith("entrar_normal_")) {
await interaction.deferUpdate();

const id = interaction.customId.split("_")[2];
const fila = filasNormal.get(id);
if (!fila) return;

if (!fila.jogadores.includes(interaction.user.id) && fila.jogadores.length < fila.max)
fila.jogadores.push(interaction.user.id);

await interaction.message.edit({
content: gerarMensagemNormal(fila),
components: interaction.message.components
});
}

if (interaction.customId.startsWith("sair_normal_")) {
await interaction.deferUpdate();

const id = interaction.customId.split("_")[2];
const fila = filasNormal.get(id);
if (!fila) return;

fila.jogadores = fila.jogadores.filter(x => x !== interaction.user.id);

await interaction.message.edit({
content: gerarMensagemNormal(fila),
components: interaction.message.components
});
}
});

/**************** FUNÇÕES ****************/

function gerarMensagemNormal(fila) {
const lista = fila.jogadores.map((id,i)=>`${i+1}. <@${id}>`).join("\n");

return `💰 Fila ${fila.modo} | ${fila.tipo}
Valor: R$ ${fila.valor}

${lista || "Vazio"}
Vagas: ${fila.jogadores.length}/${fila.max}`;
}

client.login(TOKEN);
