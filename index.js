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
GatewayIntentBits.GuildMembers
]
});

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const MODOS = { "1x1": 2, "2x2": 4, "3x3": 6, "4x4": 8 };

const filasTreino = new Map();
const configTemp = new Map();

/**************** SLASH ****************/

const commands = [
{ name: "painel", description: "Abrir painel normal" },
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

if (interaction.commandName === "painel") {

const menu = new StringSelectMenuBuilder()
.setCustomId("modo_normal")
.setPlaceholder("Escolha o modo")
.addOptions(
{ label: "1x1", value: "1x1" },
{ label: "2x2", value: "2x2" },
{ label: "3x3", value: "3x3" },
{ label: "4x4", value: "4x4" }
);

return await interaction.reply({
content: "Escolha o modo:",
components: [new ActionRowBuilder().addComponents(menu)],
ephemeral: true
});
}

if (interaction.commandName === "fila-treino") {

const modo = new StringSelectMenuBuilder()
.setCustomId("modo_treino")
.setPlaceholder("Modo")
.addOptions(
{ label: "1x1", value: "1x1" },
{ label: "2x2", value: "2x2" },
{ label: "3x3", value: "3x3" },
{ label: "4x4", value: "4x4" }
);

const tipo = new StringSelectMenuBuilder()
.setCustomId("tipo_treino")
.setPlaceholder("Tipo")
.addOptions(
{ label: "Mobile", value: "Mobile" },
{ label: "Emulador", value: "Emulador" },
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

if (interaction.customId === "modo_normal") {
return await interaction.update({
content: `Modo selecionado: ${interaction.values[0]}`,
components: []
});
}

if (!configTemp.has(interaction.user.id))
configTemp.set(interaction.user.id, {});

const data = configTemp.get(interaction.user.id);

if (interaction.customId === "modo_treino")
data.modo = interaction.values[0];

if (interaction.customId === "tipo_treino")
data.tipo = interaction.values[0];

configTemp.set(interaction.user.id, data);

return await interaction.deferUpdate();
}

/* BOTÕES */
if (interaction.isButton()) {

/* CRIAR TREINO */
if (interaction.customId === "criar_treino") {

const data = configTemp.get(interaction.user.id);

if (!data?.modo || !data?.tipo)
return await interaction.reply({
content: "Selecione modo e tipo primeiro.",
ephemeral: true
});

const id = Date.now().toString();

filasTreino.set(id, {
modo: data.modo,
tipo: data.tipo,
jogadores: [],
max: MODOS[data.modo]
});

const entrar = new ButtonBuilder()
.setCustomId(`entrar_${id}`)
.setLabel("Entrar")
.setStyle(ButtonStyle.Primary);

const sair = new ButtonBuilder()
.setCustomId(`sair_${id}`)
.setLabel("Sair")
.setStyle(ButtonStyle.Danger);

await interaction.channel.send({
content: gerarMensagem(filasTreino.get(id)),
components: [new ActionRowBuilder().addComponents(entrar, sair)]
});

return await interaction.reply({
content: "Fila criada.",
ephemeral: true
});
}

/* ENTRAR */
if (interaction.customId.startsWith("entrar_")) {

await interaction.deferUpdate();

const id = interaction.customId.split("_")[1];
const fila = filasTreino.get(id);
if (!fila) return;

if (!fila.jogadores.includes(interaction.user.id) && fila.jogadores.length < fila.max) {
fila.jogadores.push(interaction.user.id);
}

await interaction.message.edit({
content: gerarMensagem(fila),
components: interaction.message.components
});

if (fila.jogadores.length === fila.max) {
await criarCanal(interaction.guild, fila);
fila.jogadores = [];
await interaction.message.edit({
content: gerarMensagem(fila),
components: interaction.message.components
});
}
}

/* SAIR */
if (interaction.customId.startsWith("sair_")) {

await interaction.deferUpdate();

const id = interaction.customId.split("_")[1];
const fila = filasTreino.get(id);
if (!fila) return;

fila.jogadores = fila.jogadores.filter(x => x !== interaction.user.id);

await interaction.message.edit({
content: gerarMensagem(fila),
components: interaction.message.components
});
}

/* ENCERRAR */
if (interaction.customId.startsWith("encerrar_")) {
await interaction.deferUpdate();
return interaction.channel.delete();
}
}

} catch (err) {
console.log("ERRO:", err);
}
});

/**************** FUNÇÕES ****************/

function gerarMensagem(fila) {
const lista = fila.jogadores
.map((id, i) => `${i + 1}. <@${id}>`)
.join("\n");

return `🎮 Fila ${fila.modo} | ${fila.tipo}

${lista || "Vazio"}`;
}

async function criarCanal(guild, fila) {

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

const btn = new ButtonBuilder()
.setCustomId(`encerrar_${canal.id}`)
.setLabel("Encerrar Treino")
.setStyle(ButtonStyle.Danger);

await canal.send({
content: "Por favor encerrando o treino aperte em **Encerrar Treino**.\n\nBom treino!",
components: [new ActionRowBuilder().addComponents(btn)]
});
}

client.login(TOKEN);
