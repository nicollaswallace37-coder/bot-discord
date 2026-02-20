// ===== EXPRESS =====
const express = require("express");
const app = express();
app.get("/", (req, res) => res.send("Bot online ✅"));
app.listen(process.env.PORT || 3000);

// ===== DISCORD =====
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

// ===== CONFIG =====
const MEDIADOR_ID = "COLOQUE_ID_AQUI"; // 👈 coloque seu ID aqui
const MODOS = { "1x1": 2, "2x2": 4, "3x3": 6, "4x4": 8 };

const filasNormal = new Map();
const configTemp = new Map();

// ===== SLASH =====
const commands = [
{ name: "painel", description: "Abrir painel fila normal" }
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

// ===== INTERAÇÕES =====
client.on("interactionCreate", async (interaction) => {
try {

if (interaction.isChatInputCommand()) {
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

return interaction.reply({
content: "🎮 Escolha o modo:",
components: [new ActionRowBuilder().addComponents(modo)],
ephemeral: true
});
}
}

if (interaction.isStringSelectMenu()) {

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

💬 Digite até 15 valores separados por vírgula
Ex: 10,20,0.20`,
components: []
});
}
}

if (interaction.isButton()) {

if (interaction.customId.startsWith("entrar_")) {

await interaction.deferUpdate();

const id = interaction.customId.split("_")[1];
const fila = filasNormal.get(id);
if (!fila) return;

if (!fila.jogadores.includes(interaction.user.id))
fila.jogadores.push(interaction.user.id);

if (fila.jogadores.length >= fila.max) {
await criarSalaPrivada(interaction.guild, fila);
filasNormal.delete(id);
return interaction.message.delete();
}

await interaction.message.edit({
content: gerarMensagem(fila),
components: interaction.message.components
});
}

if (interaction.customId.startsWith("sair_")) {

await interaction.deferUpdate();

const id = interaction.customId.split("_")[1];
const fila = filasNormal.get(id);
if (!fila) return;

fila.jogadores = fila.jogadores.filter(x => x !== interaction.user.id);

await interaction.message.edit({
content: gerarMensagem(fila),
components: interaction.message.components
});
}
}

} catch (err) {
console.log(err);
}
});

// ===== CAPTURA VALORES =====
client.on("messageCreate", async (message) => {
if (message.author.bot) return;

const data = configTemp.get(message.author.id);
if (!data || !data.aguardandoValor) return;

const valores = message.content.split(",").map(v => v.trim()).slice(0,15);

for (const valor of valores) {

if (isNaN(valor.replace(",", "."))) continue;

const id = Date.now() + Math.random().toString(36).substring(2,6);

filasNormal.set(id, {
modo: data.modo,
tipo: data.tipo,
valor: valor,
jogadores: [],
max: MODOS[data.modo]
});

const entrar = new ButtonBuilder()
.setCustomId(`entrar_${id}`)
.setLabel("Entrar")
.setStyle(ButtonStyle.Success);

const sair = new ButtonBuilder()
.setCustomId(`sair_${id}`)
.setLabel("Sair")
.setStyle(ButtonStyle.Danger);

await message.channel.send({
content: gerarMensagem(filasNormal.get(id)),
components: [new ActionRowBuilder().addComponents(entrar, sair)]
});
}

data.aguardandoValor = false;
message.reply("Filas criadas ✅");
});

// ===== FUNÇÕES =====
function gerarMensagem(fila) {
const lista = fila.jogadores.map((id,i)=>`${i+1}. <@${id}>`).join("\n");
return `💰 ${fila.modo} | ${fila.tipo}
Valor: R$ ${fila.valor}

${lista || "Vazio"}
Vagas: ${fila.jogadores.length}/${fila.max}`;
}

async function criarSalaPrivada(guild, fila) {

const categoria = guild.channels.cache.find(c => c.name === "rush" && c.type === ChannelType.GuildCategory);
if (!categoria) return;

const canal = await guild.channels.create({
name: `rush-${fila.valor}`,
type: ChannelType.GuildText,
parent: categoria.id,
permissionOverwrites: [
{
id: guild.roles.everyone,
deny: [PermissionFlagsBits.ViewChannel]
},
{
id: MEDIADOR_ID,
allow: [PermissionFlagsBits.ViewChannel]
},
...fila.jogadores.map(id => ({
id,
allow: [PermissionFlagsBits.ViewChannel]
}))
]
});

canal.send(`Sala criada ✅
Mediador: <@${MEDIADOR_ID}>
Jogadores:
${fila.jogadores.map(x=>`<@${x}>`).join("\n")}`);
}

client.login(TOKEN);
