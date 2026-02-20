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

if (interaction.isButton()) {

/* ENTRAR NORMAL */
if (interaction.customId.startsWith("entrar_normal_")) {

const id = interaction.customId.replace("entrar_normal_", "");
const fila = filasNormal.get(id);
if (!fila || fila.confirmado) return interaction.deferUpdate();

if (!fila.jogadores.includes(interaction.user.id) && fila.jogadores.length < fila.max)
fila.jogadores.push(interaction.user.id);

await interaction.deferUpdate();
await interaction.message.edit({
content: gerarMensagemNormal(fila),
components: interaction.message.components
});

if (fila.jogadores.length === fila.max) {

await criarCanalPrivado(interaction, fila);

filasNormal.delete(id);

/* NOVO ID REALMENTE ÚNICO */
const novoId = `${Date.now()}_${Math.random().toString(36).substring(2,9)}`;

filasNormal.set(novoId, {
modo: fila.modo,
tipo: fila.tipo,
valor: fila.valor,
jogadores: [],
max: fila.max,
confirmado: false
});

await enviarNovaFila(interaction.channel, novoId, fila);
}
}

/* SAIR NORMAL */
if (interaction.customId.startsWith("sair_normal_")) {

const id = interaction.customId.replace("sair_normal_", "");
const fila = filasNormal.get(id);
if (!fila || fila.confirmado) return interaction.deferUpdate();

fila.jogadores = fila.jogadores.filter(x => x !== interaction.user.id);

await interaction.deferUpdate();
await interaction.message.edit({
content: gerarMensagemNormal(fila),
components: interaction.message.components
});
}

}

} catch (err) {
console.log("ERRO:", err);
}
});

/**************** CAPTURA VALORES ****************/

client.on("messageCreate", async (message) => {
if (message.author.bot) return;

const data = configTemp.get(message.author.id);
if (!data || !data.aguardandoValor) return;

const valores = message.content
.split(",")
.map(v => v.trim())
.filter(v => v !== "");

if (valores.length > 15)
return message.reply("Máximo de 15 valores.");

if (valores.some(v => isNaN(v)))
return message.reply("Use apenas números.");

data.aguardandoValor = false;

/* CRIA FILA TOTALMENTE INDEPENDENTE PARA CADA VALOR */
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

await enviarNovaFila(message.channel, id, {
modo: data.modo,
tipo: data.tipo,
valor: valor
});
}

message.reply("Filas criadas com sucesso ✅");
});

/**************** FUNÇÕES ****************/

async function enviarNovaFila(channel, id, fila) {

const entrar = new ButtonBuilder()
.setCustomId(`entrar_normal_${id}`)
.setLabel("Entrar")
.setStyle(ButtonStyle.Success);

const sair = new ButtonBuilder()
.setCustomId(`sair_normal_${id}`)
.setLabel("Sair")
.setStyle(ButtonStyle.Danger);

const confirmar = new ButtonBuilder()
.setCustomId(`confirmar_${id}`)
.setLabel("Confirmar")
.setStyle(ButtonStyle.Primary);

const encerrar = new ButtonBuilder()
.setCustomId(`encerrar_${id}`)
.setLabel("Encerrar")
.setStyle(ButtonStyle.Secondary);

await channel.send({
content: gerarMensagemNormal(filasNormal.get(id)),
components: [
new ActionRowBuilder().addComponents(entrar, sair),
new ActionRowBuilder().addComponents(confirmar, encerrar)
]
});
}

function gerarMensagemNormal(fila) {
const lista = fila.jogadores.map((id,i)=>`${i+1}. <@${id}>`).join("\n");

return `💰 Fila ${fila.modo} | ${fila.tipo}
Valor: ${fila.valor}

${fila.confirmado ? "✅ CONFIRMADA\n" : ""}

${lista || "Vazio"}
Vagas: ${fila.jogadores.length}/${fila.max}`;
}

async function criarCanalPrivado(interaction, fila) {

const categoria = interaction.guild.channels.cache
.find(c => c.name.toLowerCase() === "rush" && c.type === ChannelType.GuildCategory);

if (!categoria) return;

const canal = await interaction.guild.channels.create({
name: `fila-${fila.modo}-${fila.valor}`,
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
Valor: ${fila.valor}

${fila.jogadores.map(id => `<@${id}>`).join("\n")}`);
}

client.login(TOKEN);
