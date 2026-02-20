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

/* ================= COMANDOS ================= */

if (interaction.isChatInputCommand()) {

/* PAINEL NORMAL */
if (interaction.commandName === "painel") {

const modo = new StringSelectMenuBuilder()
.setCustomId("normal_modo")
.addOptions(
{ label: "1x1", value: "1x1" },
{ label: "2x2", value: "2x2" },
{ label: "3x3", value: "3x3" },
{ label: "4x4", value: "4x4" }
);

return interaction.reply({
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

return interaction.reply({
content: "Configure a fila treino:",
components: [
new ActionRowBuilder().addComponents(modo),
new ActionRowBuilder().addComponents(tipo),
new ActionRowBuilder().addComponents(btn)
]
});
}
}

/* ================= SELECT MENUS ================= */

if (interaction.isStringSelectMenu()) {

/* NORMAL */
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

return interaction.update({
content: `Modo: ${interaction.values[0]}\n\nEscolha o tipo:`,
components: [new ActionRowBuilder().addComponents(tipo)]
});
}

if (interaction.customId === "normal_tipo") {
const data = configTemp.get(interaction.user.id);
data.tipo = interaction.values[0];
data.aguardandoValor = true;

return interaction.update({
content: `Modo: ${data.modo}
Tipo: ${data.tipo}

💰 Digite até 15 valores separados por vírgula
Ex: 2,10,25`,
components: []
});
}

/* TREINO */
if (interaction.customId === "modo_treino") {
if (!configTemp.has(interaction.user.id))
configTemp.set(interaction.user.id, {});
configTemp.get(interaction.user.id).modo = interaction.values[0];
return interaction.deferUpdate();
}

if (interaction.customId === "tipo_treino") {
if (!configTemp.has(interaction.user.id))
configTemp.set(interaction.user.id, {});
configTemp.get(interaction.user.id).tipo = interaction.values[0];
return interaction.deferUpdate();
}
}

/* ================= BOTÕES ================= */

if (interaction.isButton()) {

/* CRIAR TREINO */
if (interaction.customId === "criar_treino") {

const data = configTemp.get(interaction.user.id);
if (!data?.modo || !data?.tipo)
return interaction.reply({ content: "Selecione modo e tipo.", ephemeral: true });

const id = `${Date.now()}_${Math.random().toString(36).substring(2,9)}`;

filasTreino.set(id, {
modo: data.modo,
tipo: data.tipo,
jogadores: [],
max: MODOS[data.modo]
});

await enviarFilaTreino(interaction.channel, id);
return interaction.reply({ content: "Fila treino criada ✅", ephemeral: true });
}

/* ENTRAR TREINO */
if (interaction.customId.startsWith("entrar_treino_")) {

const id = interaction.customId.replace("entrar_treino_", "");
const fila = filasTreino.get(id);
if (!fila) return interaction.deferUpdate();

if (!fila.jogadores.includes(interaction.user.id) && fila.jogadores.length < fila.max)
fila.jogadores.push(interaction.user.id);

await interaction.deferUpdate();
await interaction.message.edit({
content: gerarMensagemTreino(fila),
components: interaction.message.components
});

if (fila.jogadores.length === fila.max)
await criarCanalPrivado(interaction, fila);
}

/* SAIR TREINO */
if (interaction.customId.startsWith("sair_treino_")) {

const id = interaction.customId.replace("sair_treino_", "");
const fila = filasTreino.get(id);
if (!fila) return interaction.deferUpdate();

fila.jogadores = fila.jogadores.filter(x => x !== interaction.user.id);

await interaction.deferUpdate();
await interaction.message.edit({
content: gerarMensagemTreino(fila),
components: interaction.message.components
});
}
}

} catch (err) {
console.log("ERRO:", err);
}
});

/**************** CAPTURA VALORES NORMAL ****************/

client.on("messageCreate", async (message) => {
if (message.author.bot) return;

const data = configTemp.get(message.author.id);
if (!data || !data.aguardandoValor) return;

const valores = message.content.split(",").map(v => v.trim()).filter(v => v !== "");

if (valores.length > 15)
return message.reply("Máximo de 15 valores.");

if (valores.some(v => isNaN(v)))
return message.reply("Use apenas números.");

data.aguardandoValor = false;

for (const valor of valores) {

const id = `${Date.now()}_${Math.random().toString(36).substring(2,9)}`;

filasNormal.set(id, {
modo: data.modo,
tipo: data.tipo,
valor: valor,
jogadores: [],
max: MODOS[data.modo],
confirmado: false
});

await enviarFilaNormal(message.channel, id);
}

message.reply("Filas criadas com sucesso ✅");
});

/**************** FUNÇÕES ****************/

async function enviarFilaNormal(channel, id) {

const entrar = new ButtonBuilder()
.setCustomId(`entrar_normal_${id}`)
.setLabel("Entrar")
.setStyle(ButtonStyle.Success);

const sair = new ButtonBuilder()
.setCustomId(`sair_normal_${id}`)
.setLabel("Sair")
.setStyle(ButtonStyle.Danger);

await channel.send({
content: gerarMensagemNormal(filasNormal.get(id)),
components: [new ActionRowBuilder().addComponents(entrar, sair)]
});
}

async function enviarFilaTreino(channel, id) {

const entrar = new ButtonBuilder()
.setCustomId(`entrar_treino_${id}`)
.setLabel("Entrar")
.setStyle(ButtonStyle.Primary);

const sair = new ButtonBuilder()
.setCustomId(`sair_treino_${id}`)
.setLabel("Sair")
.setStyle(ButtonStyle.Danger);

await channel.send({
content: gerarMensagemTreino(filasTreino.get(id)),
components: [new ActionRowBuilder().addComponents(entrar, sair)]
});
}

function gerarMensagemNormal(fila) {
const lista = fila.jogadores.map((id,i)=>`${i+1}. <@${id}>`).join("\n");
return `💰 Fila ${fila.modo} | ${fila.tipo}
Valor: ${fila.valor}

${lista || "Vazio"}
Vagas: ${fila.jogadores.length}/${fila.max}`;
}

function gerarMensagemTreino(fila) {
const lista = fila.jogadores.map((id,i)=>`${i+1}. <@${id}>`).join("\n");
return `🏋️ Treino ${fila.modo} | ${fila.tipo}

${lista || "Vazio"}
Vagas: ${fila.jogadores.length}/${fila.max}`;
}

async function criarCanalPrivado(interaction, fila) {

const categoria = interaction.guild.channels.cache
.find(c => c.name.toLowerCase() === "rush" && c.type === ChannelType.GuildCategory);

if (!categoria) return;

const canal = await interaction.guild.channels.create({
name: `fila-${fila.modo}`,
type: ChannelType.GuildText,
parent: categoria.id,
permissionOverwrites: [
{
id: interaction.guild.id,
deny: [PermissionFlagsBits.ViewChannel]
},
...fila.jogadores.map(id => ({
id,
allow: [PermissionFlagsBits.ViewChannel]
}))
]
});

canal.send(`🔥 Fila fechada!

Modo: ${fila.modo}
${fila.valor ? `Valor: ${fila.valor}` : ""}

${fila.jogadores.map(id => `<@${id}>`).join("\n")}`);
}

client.login(TOKEN);
