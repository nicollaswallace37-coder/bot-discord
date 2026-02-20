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
ModalBuilder,
TextInputBuilder,
TextInputStyle,
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
const PIX = "450.553.628.98";

const MODOS = { "1x1": 2, "2x2": 4, "3x3": 6, "4x4": 8 };

const filas = {};
const filasTemp = {};
const partidasAtivas = {};

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

/************* COMANDO TREINO *************/
if (interaction.isChatInputCommand() && interaction.commandName === "fila-treino") {

const modoMenu = new StringSelectMenuBuilder()
.setCustomId("modo_select_treino")
.addOptions(
{ label: "1x1", value: "1x1" },
{ label: "2x2", value: "2x2" },
{ label: "3x3", value: "3x3" },
{ label: "4x4", value: "4x4" }
);

const tipoMenu = new StringSelectMenuBuilder()
.setCustomId("tipo_select_treino")
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

/************* BOTÕES *************/
if (interaction.isButton()) {

/***** ENTRAR NORMAL *****/
if (interaction.customId.startsWith("entrar_") && !interaction.customId.includes("treino")) {

await interaction.deferUpdate();

const key = interaction.customId.replace("entrar_", "");
const fila = filas[key];
if (!fila) return;

if (!fila.jogadores.includes(interaction.user.id) && fila.jogadores.length < MODOS[fila.modo]) {
fila.jogadores.push(interaction.user.id);
}

await atualizarMensagemFila(interaction.message, fila);
}

/***** SAIR NORMAL *****/
if (interaction.customId.startsWith("sair_") && !interaction.customId.includes("treino")) {

await interaction.deferUpdate();

const key = interaction.customId.replace("sair_", "");
const fila = filas[key];
if (!fila) return;

fila.jogadores = fila.jogadores.filter(id => id !== interaction.user.id);

await atualizarMensagemFila(interaction.message, fila);
}

/***** CRIAR TREINO *****/
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

/***** ENTRAR TREINO *****/
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

/***** SAIR TREINO *****/
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

/***** ENCERRAR TREINO *****/
if (interaction.customId.startsWith("encerrar_treino_")) {
return interaction.channel.delete();
}

}

} catch (err) {
console.log(err);
}
});

/**************** FUNÇÕES ****************/

async function atualizarMensagemFila(message, fila) {

const embed = new EmbedBuilder()
.setTitle(`Fila ${fila.modo}`)
.setDescription(`Tipo: ${fila.tipo}
Valor: R$ ${fila.preco}

Jogadores (${fila.jogadores.length}/${MODOS[fila.modo]})
${fila.jogadores.map(id => `<@${id}>`).join("\n") || "Vazio"}`);

await message.edit({ embeds: [embed], components: message.components });
}

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
