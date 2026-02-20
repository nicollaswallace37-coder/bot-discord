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

/* ================= BOTÕES ================= */

if (interaction.isButton()) {

/* 🔥 ENTRAR NORMAL CORRIGIDO DEFINITIVO */
if (interaction.customId.startsWith("entrar_normal_")) {

const id = interaction.customId.replace("entrar_normal_", "");
const fila = filasNormal.get(id);

if (!fila)
return interaction.reply({ content: "Fila não encontrada.", ephemeral: true });

if (fila.confirmado)
return interaction.reply({ content: "Fila já confirmada.", ephemeral: true });

if (fila.jogadores.includes(interaction.user.id))
return interaction.reply({ content: "Você já está na fila.", ephemeral: true });

if (fila.jogadores.length >= fila.max)
return interaction.reply({ content: "Fila cheia.", ephemeral: true });

fila.jogadores.push(interaction.user.id);

/* CORREÇÃO DO ERRO 10062 */
if (!interaction.deferred && !interaction.replied) {
await interaction.deferUpdate();
}

await interaction.message.edit({
content: gerarMensagemNormal(fila),
components: interaction.message.components
});

if (fila.jogadores.length === fila.max) {
await criarCanalPrivado(interaction, fila);
}

return;
}

/* SAIR NORMAL */
if (interaction.customId.startsWith("sair_normal_")) {

const id = interaction.customId.replace("sair_normal_", "");
const fila = filasNormal.get(id);
if (!fila) return interaction.deferUpdate();

fila.jogadores = fila.jogadores.filter(x => x !== interaction.user.id);

if (!interaction.deferred && !interaction.replied) {
await interaction.deferUpdate();
}

await interaction.message.edit({
content: gerarMensagemNormal(fila),
components: interaction.message.components
});
return;
}

}

} catch (err) {
console.log("ERRO:", err);
}
});

/**************** FUNÇÕES ****************/

function gerarMensagemNormal(fila) {
const lista = fila.jogadores.map((id,i)=>`${i+1}. <@${id}>`).join("\n");
return `💰 Fila ${fila.modo} | ${fila.tipo}
Valor: ${fila.valor}

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
Valor: ${fila.valor}

${fila.jogadores.map(id => `<@${id}>`).join("\n")}`);
}

client.login(TOKEN);
