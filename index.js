/**************** EXPRESS ****************/
const express = require("express");
const app = express();
app.get("/", (req, res) => res.send("Bot online ✅"));
app.listen(process.env.PORT || 3000);

/**************** DISCORD ****************/
const {
Client,
GatewayIntentBits,
EmbedBuilder,
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
GatewayIntentBits.MessageContent,
GatewayIntentBits.GuildMembers
]
});

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const MODOS = { "1x1": 2, "2x2": 4, "3x3": 6, "4x4": 8 };

const filasTreino = new Map();
const configTempTreino = new Map();

/**************** SLASH ****************/

const commands = [
{ name: "painel", description: "Abrir painel" },
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
console.log(`✅ Bot online como ${client.user.tag}`);
});

/**************** INTERAÇÕES ****************/

client.on("interactionCreate", async (interaction) => {
try {

/************* COMANDO PAINEL *************/
if (interaction.isChatInputCommand() && interaction.commandName === "painel") {

const row = new ActionRowBuilder().addComponents(
new StringSelectMenuBuilder()
.setCustomId("modo_select_normal")
.setPlaceholder("Escolha o modo")
.addOptions(
{ label: "1x1", value: "1x1" },
{ label: "2x2", value: "2x2" },
{ label: "3x3", value: "3x3" },
{ label: "4x4", value: "4x4" }
)
);

return interaction.reply({
content: "Escolha o modo:",
components: [row],
ephemeral: true
});
}

/************* SELECT PAINEL *************/
if (interaction.isStringSelectMenu()) {

if (interaction.customId === "modo_select_normal") {
await interaction.update({
content: `Modo selecionado: ${interaction.values[0]}`,
components: []
});
return;
}

if (!configTempTreino.has(interaction.user.id))
configTempTreino.set(interaction.user.id, {});

const data = configTempTreino.get(interaction.user.id);

if (interaction.customId === "modo_select_treino")
data.modo = interaction.values[0];

if (interaction.customId === "tipo_select_treino")
data.tipo = interaction.values[0];

configTempTreino.set(interaction.user.id, data);

await interaction.deferUpdate();
return;
}

/************* COMANDO TREINO *************/
if (interaction.isChatInputCommand() && interaction.commandName === "fila-treino") {

const modoMenu = new StringSelectMenuBuilder()
.setCustomId("modo_select_treino")
.setPlaceholder("Selecione o modo")
.addOptions(
{ label: "1x1", value: "1x1" },
{ label: "2x2", value: "2x2" },
{ label: "3x3", value: "3x3" },
{ label: "4x4", value: "4x4" }
);

const tipoMenu = new StringSelectMenuBuilder()
.setCustomId("tipo_select_treino")
.setPlaceholder("Selecione o tipo")
.addOptions(
{ label: "Mobile", value: "Mobile" },
{ label: "Emu", value: "Emu" },
{ label: "Misto", value: "Misto" },
{ label: "Tático", value: "Tático" },
{ label: "Full Soco", value: "Full Soco" }
);

const criarBtn = new ButtonBuilder()
.setCustomId("criar_fila_treino")
.setLabel("Criar Fila")
.setStyle(ButtonStyle.Success);

return interaction.reply({
content: "🎮 Configure a fila:",
components: [
new ActionRowBuilder().addComponents(modoMenu),
new ActionRowBuilder().addComponents(tipoMenu),
new ActionRowBuilder().addComponents(criarBtn)
]
});
}

/************* BOTÕES TREINO *************/
if (interaction.isButton()) {

/* CRIAR */
if (interaction.customId === "criar_fila_treino") {

const data = configTempTreino.get(interaction.user.id);
if (!data?.modo || !data?.tipo)
return interaction.reply({ content: "⚠️ Selecione modo e tipo!", ephemeral: true });

const filaId = Date.now().toString();

filasTreino.set(filaId, {
modo: data.modo,
tipo: data.tipo,
jogadores: [],
max: MODOS[data.modo]
});

const entrar = new ButtonBuilder()
.setCustomId(`entrar_treino_${filaId}`)
.setLabel("Entrar")
.setStyle(ButtonStyle.Primary);

const sair = new ButtonBuilder()
.setCustomId(`sair_treino_${filaId}`)
.setLabel("Sair")
.setStyle(ButtonStyle.Danger);

await interaction.channel.send({
content: gerarMensagemTreino(filasTreino.get(filaId)),
components: [new ActionRowBuilder().addComponents(entrar, sair)]
});

return interaction.reply({ content: "✅ Fila criada!", ephemeral: true });
}

/* ENTRAR */
if (interaction.customId.startsWith("entrar_treino_")) {

await interaction.deferUpdate();

const filaId = interaction.customId.split("_")[2];
const fila = filasTreino.get(filaId);
if (!fila) return;

if (!fila.jogadores.includes(interaction.user.id) && fila.jogadores.length < fila.max) {
fila.jogadores.push(interaction.user.id);
}

await interaction.message.edit({
content: gerarMensagemTreino(fila),
components: interaction.message.components
});

if (fila.jogadores.length === fila.max) {
await criarCanalTreino(interaction.guild, fila);
fila.jogadores = [];
await interaction.message.edit({
content: gerarMensagemTreino(fila),
components: interaction.message.components
});
}
}

/* SAIR */
if (interaction.customId.startsWith("sair_treino_")) {

await interaction.deferUpdate();

const filaId = interaction.customId.split("_")[2];
const fila = filasTreino.get(filaId);
if (!fila) return;

fila.jogadores = fila.jogadores.filter(id => id !== interaction.user.id);

await interaction.message.edit({
content: gerarMensagemTreino(fila),
components: interaction.message.components
});
}

/* ENCERRAR */
if (interaction.customId.startsWith("encerrar_treino_")) {
await interaction.deferUpdate();
return interaction.channel.delete();
}

}

} catch (err) {
console.log(err);
}
});

/**************** FUNÇÕES ****************/

function gerarMensagemTreino(fila) {
const lista = fila.jogadores
.map((id, i) => `${i + 1}. <@${id}>`)
.join("\n");

return `🎮 Fila - ${fila.modo} | ${fila.tipo}

Jogadores:
${lista || "Vazio"}`;
}

async function criarCanalTreino(guild, fila) {

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

const encerrar = new ButtonBuilder()
.setCustomId(`encerrar_treino_${canal.id}`)
.setLabel("Encerrar Treino")
.setStyle(ButtonStyle.Danger);

await canal.send({
content: "Por favor encerrando o treino aperte em **Encerrar Treino**.\n\nBom treino!",
components: [new ActionRowBuilder().addComponents(encerrar)]
});
}

client.login(TOKEN);
