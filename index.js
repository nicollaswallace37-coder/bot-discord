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
.setPlaceholder("Escolha o tipo")
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

configTemp.get(interaction.user.id).tipo = interaction.values[0];

const valor = new StringSelectMenuBuilder()
.setCustomId("normal_valor")
.setPlaceholder("Escolha o valor")
.addOptions(
{ label: "0.70", value: "0.70" },
{ label: "1.00", value: "1.00" },
{ label: "2.00", value: "2.00" },
{ label: "5.00", value: "5.00" }
);

return await interaction.update({
content: `Modo: ${configTemp.get(interaction.user.id).modo}
Tipo: ${interaction.values[0]}

Escolha o valor:`,
components: [new ActionRowBuilder().addComponents(valor)]
});
}

/* VALOR NORMAL */
if (interaction.customId === "normal_valor") {

const data = configTemp.get(interaction.user.id);
data.valor = interaction.values[0];

const id = Date.now().toString();

filasNormal.set(id, {
modo: data.modo,
tipo: data.tipo,
valor: data.valor,
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

await interaction.channel.send({
content: gerarMensagemNormal(filasNormal.get(id)),
components: [new ActionRowBuilder().addComponents(entrar, sair)]
});

return await interaction.update({
content: "Fila criada com sucesso ✅",
components: []
});
}

/* TREINO CONFIG */
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

/* ENTRAR NORMAL */
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

/* SAIR NORMAL */
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

/* CRIAR TREINO */
if (interaction.customId === "criar_treino") {

const data = configTemp.get(interaction.user.id);
if (!data?.modo || !data?.tipo)
return interaction.reply({ content: "Selecione modo e tipo.", ephemeral: true });

const id = Date.now().toString();

filasTreino.set(id, {
modo: data.modo,
tipo: data.tipo,
jogadores: [],
max: MODOS[data.modo]
});

const entrar = new ButtonBuilder()
.setCustomId(`entrar_treino_${id}`)
.setLabel("Entrar")
.setStyle(ButtonStyle.Primary);

const sair = new ButtonBuilder()
.setCustomId(`sair_treino_${id}`)
.setLabel("Sair")
.setStyle(ButtonStyle.Danger);

await interaction.channel.send({
content: gerarMensagemTreino(filasTreino.get(id)),
components: [new ActionRowBuilder().addComponents(entrar, sair)]
});

return interaction.reply({ content: "Fila treino criada ✅", ephemeral: true });
}

/* ENTRAR TREINO */
if (interaction.customId.startsWith("entrar_treino_")) {

await interaction.deferUpdate();

const id = interaction.customId.split("_")[2];
const fila = filasTreino.get(id);
if (!fila) return;

if (!fila.jogadores.includes(interaction.user.id) && fila.jogadores.length < fila.max)
fila.jogadores.push(interaction.user.id);

await interaction.message.edit({
content: gerarMensagemTreino(fila),
components: interaction.message.components
});

if (fila.jogadores.length === fila.max) {
await criarCanal(interaction.guild, fila);
fila.jogadores = [];
await interaction.message.edit({
content: gerarMensagemTreino(fila),
components: interaction.message.components
});
}
}

/* SAIR TREINO */
if (interaction.customId.startsWith("sair_treino_")) {

await interaction.deferUpdate();

const id = interaction.customId.split("_")[2];
const fila = filasTreino.get(id);
if (!fila) return;

fila.jogadores = fila.jogadores.filter(x => x !== interaction.user.id);

await interaction.message.edit({
content: gerarMensagemTreino(fila),
components: interaction.message.components
});
}

/* ENCERRAR TREINO */
if (interaction.customId.startsWith("encerrar_")) {
if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels))
return interaction.reply({ content: "Apenas staff pode encerrar.", ephemeral: true });

await interaction.deferUpdate();
return interaction.channel.delete();
}
}

} catch (err) {
console.log("ERRO:", err);
}
});

/**************** FUNÇÕES ****************/

function gerarMensagemNormal(fila) {
const lista = fila.jogadores
.map((id, i) => `${i + 1}. <@${id}>`)
.join("\n");

return `💰 Fila ${fila.modo} | ${fila.tipo}
Valor: R$ ${fila.valor}

${lista || "Vazio"}
Vagas: ${fila.jogadores.length}/${fila.max}`;
}

function gerarMensagemTreino(fila) {
const lista = fila.jogadores
.map((id, i) => `${i + 1}. <@${id}>`)
.join("\n");

return `🔥 Fila Treino ${fila.modo} | ${fila.tipo}

${lista || "Vazio"}
Vagas: ${fila.jogadores.length}/${fila.max}`;
}

async function criarCanal(guild, fila) {

const categoria = guild.channels.cache.find(
c => c.name.toLowerCase() === "rush treino" && c.type === ChannelType.GuildCategory
);

if (!categoria) return;

const canal = await guild.channels.create({
name: `treino-${fila.modo}-${fila.tipo}`.toLowerCase().replace(/ /g, "-"),
type: ChannelType.GuildText,
parent: categoria.id,
permissionOverwrites: [
{ id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
{
id: guild.members.me.id,
allow: [
PermissionFlagsBits.ViewChannel,
PermissionFlagsBits.SendMessages,
PermissionFlagsBits.ManageChannels
]
},
...fila.jogadores.map(id => ({
id,
allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
}))
]
});

const btn = new ButtonBuilder()
.setCustomId(`encerrar_${canal.id}`)
.setLabel("Encerrar Treino")
.setStyle(ButtonStyle.Danger);

await canal.send({
content: `🔥 Treino iniciado!

Modo: ${fila.modo}
Tipo: ${fila.tipo}

Ao finalizar clique em **Encerrar Treino**.`,
components: [new ActionRowBuilder().addComponents(btn)]
});
}

client.login(TOKEN);
