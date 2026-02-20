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
const configTemp = new Map();

/**************** SLASH ****************/

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

/**************** INTERAÇÕES ****************/

client.on("interactionCreate", async (interaction) => {
try {

/* COMANDO */
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

/* SELECT */
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

💰 Digite até 15 valores separados por vírgula
Ex: 0.50, 1, 2.75, 10`,
components: []
});
}
}

/* BOTÕES */
if (interaction.isButton()) {

const id = interaction.customId.split("_")[2];
const fila = filasNormal.get(id);
if (!fila) return;

/* ENTRAR */
if (interaction.customId.startsWith("entrar_normal_")) {
await interaction.deferUpdate();

if (!fila.jogadores.includes(interaction.user.id) && fila.jogadores.length < fila.max)
fila.jogadores.push(interaction.user.id);

await interaction.message.edit({
content: gerarMensagem(fila),
components: interaction.message.components
});

/* SE ENCHEU */
if (fila.jogadores.length === fila.max) {

const categoria = interaction.guild.channels.cache
.find(c => c.name.toLowerCase() === "rush" && c.type === ChannelType.GuildCategory);

if (!categoria) return;

const canal = await interaction.guild.channels.create({
name: `fila-${fila.modo}-${Date.now()}`,
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

canal.send(`🔥 Fila fechada!\n\n${fila.jogadores.map(id => `<@${id}>`).join("\n")}`);
}
}

/* SAIR */
if (interaction.customId.startsWith("sair_normal_")) {
await interaction.deferUpdate();
fila.jogadores = fila.jogadores.filter(x => x !== interaction.user.id);

await interaction.message.edit({
content: gerarMensagem(fila),
components: interaction.message.components
});
}

/* CONFIRMAR */
if (interaction.customId.startsWith("confirmar_")) {

if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels))
return interaction.reply({ content: "Apenas staff confirma.", ephemeral: true });

fila.confirmado = true;

await interaction.update({
content: gerarMensagem(fila),
components: interaction.message.components
});
}

/* ENCERRAR */
if (interaction.customId.startsWith("encerrar_")) {

if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels))
return interaction.reply({ content: "Apenas staff encerra.", ephemeral: true });

await interaction.channel.delete();
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

data.valores = valores;
data.aguardandoValor = false;

const id = Date.now().toString();

filasNormal.set(id, {
modo: data.modo,
tipo: data.tipo,
valores: valores,
jogadores: [],
max: MODOS[data.modo],
confirmado: false
});

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

await message.channel.send({
content: gerarMensagem(filasNormal.get(id)),
components: [
new ActionRowBuilder().addComponents(entrar, sair),
new ActionRowBuilder().addComponents(confirmar, encerrar)
]
});

message.reply("Fila criada com sucesso ✅");
});

/**************** FUNÇÃO ****************/

function gerarMensagem(fila) {

const lista = fila.jogadores.map((id,i)=>`${i+1}. <@${id}>`).join("\n");

return `💰 Fila ${fila.modo} | ${fila.tipo}
Valores: ${fila.valores.join(", ")}

${fila.confirmado ? "✅ CONFIRMADA\n" : ""}

${lista || "Vazio"}
Vagas: ${fila.jogadores.length}/${fila.max}`;
}

client.login(TOKEN);
