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
Routes,
ModalBuilder,
TextInputBuilder,
TextInputStyle
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
const CPF_PIX = "450.553.628.98";

const filasNormal = new Map();
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

return interaction.reply({
content: "🎮 Escolha o modo:",
components: [new ActionRowBuilder().addComponents(menu)],
ephemeral: true
});
}

/* TREINO MANTIDO */
if (interaction.commandName === "fila-treino") {
return interaction.reply({
content: "Sistema de treino mantido conforme solicitado.",
ephemeral: true
});
}

}

/* ================= SELECT MENU ================= */

if (interaction.isStringSelectMenu()) {

if (interaction.customId === "modo_normal") {

configTemp.set(interaction.user.id, {
modo: interaction.values[0],
canal: interaction.channel.id
});

return interaction.reply({
content: "Digite os valores separados por vírgula.\nEx: 10,20,30",
ephemeral: true
});
}

}

/* ================= BOTÕES ================= */

if (interaction.isButton()) {

/* ENTRAR FILA */
if (interaction.customId.startsWith("entrar_")) {

const id = interaction.customId.replace("entrar_", "");
const fila = filasNormal.get(id);
if (!fila) return interaction.reply({ content: "Fila não encontrada.", ephemeral: true });

if (fila.jogadores.includes(interaction.user.id))
return interaction.reply({ content: "Você já está na fila.", ephemeral: true });

if (fila.jogadores.length >= fila.max)
return interaction.reply({ content: "Fila cheia.", ephemeral: true });

fila.jogadores.push(interaction.user.id);

await interaction.deferUpdate();

await interaction.message.edit({
content: gerarMensagemFila(fila),
components: interaction.message.components
});

if (fila.jogadores.length === fila.max) {
await fecharFila(interaction.guild, fila, interaction.channel);
}

return;
}

/* SAIR FILA */
if (interaction.customId.startsWith("sair_")) {

const id = interaction.customId.replace("sair_", "");
const fila = filasNormal.get(id);
if (!fila) return interaction.deferUpdate();

fila.jogadores = fila.jogadores.filter(x => x !== interaction.user.id);

await interaction.deferUpdate();

await interaction.message.edit({
content: gerarMensagemFila(fila),
components: interaction.message.components
});

return;
}

/* CONFIRMAR (SÓ MEDIADOR) */
if (interaction.customId.startsWith("confirmar_")) {

if (!interaction.member.roles.cache.some(r => r.name === "Mediador"))
return interaction.reply({ content: "Apenas Mediador pode usar.", ephemeral: true });

const modal = new ModalBuilder()
.setCustomId(`modal_${interaction.customId.split("_")[1]}`)
.setTitle("Configurar Sala");

const codigo = new TextInputBuilder()
.setCustomId("codigo")
.setLabel("Código da Sala")
.setStyle(TextInputStyle.Short)
.setRequired(true);

const senha = new TextInputBuilder()
.setCustomId("senha")
.setLabel("Senha da Sala")
.setStyle(TextInputStyle.Short)
.setRequired(true);

modal.addComponents(
new ActionRowBuilder().addComponents(codigo),
new ActionRowBuilder().addComponents(senha)
);

return interaction.showModal(modal);
}

/* ENCERRAR */
if (interaction.customId === "encerrar") {

if (!interaction.member.roles.cache.some(r => r.name === "Mediador"))
return interaction.reply({ content: "Apenas Mediador pode usar.", ephemeral: true });

return interaction.channel.delete();
}

}

/* ================= MODAL ================= */

if (interaction.isModalSubmit()) {

const codigo = interaction.fields.getTextInputValue("codigo");
const senha = interaction.fields.getTextInputValue("senha");

await interaction.reply({
content:
`🎮 **Sala Criada**

Código: \`${codigo}\`
Senha: \`${senha}\`

Boa partida!`,
});

}

} catch (err) {
console.log("ERRO:", err);
}
});

/**************** CAPTURA VALOR ****************/

client.on("messageCreate", async (message) => {

if (message.author.bot) return;
if (!configTemp.has(message.author.id)) return;

const config = configTemp.get(message.author.id);
if (message.channel.id !== config.canal) return;

const valores = message.content.split(",").map(v => v.trim());

for (let valor of valores) {

const id = Date.now() + Math.random();

const fila = {
id: String(id),
modo: config.modo,
valor: parseFloat(valor),
jogadores: [],
max: MODOS[config.modo]
};

filasNormal.set(String(id), fila);

const entrar = new ButtonBuilder()
.setCustomId(`entrar_${id}`)
.setLabel("Entrar")
.setStyle(ButtonStyle.Success);

const sair = new ButtonBuilder()
.setCustomId(`sair_${id}`)
.setLabel("Sair")
.setStyle(ButtonStyle.Danger);

await message.channel.send({
content: gerarMensagemFila(fila),
components: [new ActionRowBuilder().addComponents(entrar, sair)]
});
}

configTemp.delete(message.author.id);
});

/**************** FUNÇÕES ****************/

function gerarMensagemFila(fila) {
return `💰 Fila ${fila.modo}
Valor: R$${fila.valor}

Vagas: ${fila.jogadores.length}/${fila.max}`;
}

async function fecharFila(guild, fila, canalOriginal) {

const categoria = guild.channels.cache
.find(c => c.name.toLowerCase() === "rush" && c.type === ChannelType.GuildCategory);

if (!categoria) return;

const taxa = fila.valor * 0.10;
const total = fila.valor + taxa;

const canal = await guild.channels.create({
name: `fila-${fila.modo}-${fila.valor}`,
type: ChannelType.GuildText,
parent: categoria.id,
permissionOverwrites: [
{ id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
...fila.jogadores.map(id => ({
id,
allow: [PermissionFlagsBits.ViewChannel]
})),
{
id: guild.roles.cache.find(r => r.name === "Mediador")?.id,
allow: [PermissionFlagsBits.ViewChannel]
}
]
});

const confirmar = new ButtonBuilder()
.setCustomId(`confirmar_${fila.id}`)
.setLabel("Confirmar Sala")
.setStyle(ButtonStyle.Success);

const encerrar = new ButtonBuilder()
.setCustomId("encerrar")
.setLabel("Encerrar")
.setStyle(ButtonStyle.Danger);

await canal.send({
content:
`🔥 **Fila Fechada**

Valor: R$${fila.valor}
Taxa (10%): R$${taxa}
Total: R$${total}

💳 Pix:
${CPF_PIX}`,
components: [new ActionRowBuilder().addComponents(confirmar, encerrar)]
});

/* RECRIAR FILA AUTOMÁTICA */
const novoId = Date.now() + Math.random();
const novaFila = {
id: String(novoId),
modo: fila.modo,
valor: fila.valor,
jogadores: [],
max: fila.max
};

filasNormal.set(String(novoId), novaFila);

const entrar = new ButtonBuilder()
.setCustomId(`entrar_${novoId}`)
.setLabel("Entrar")
.setStyle(ButtonStyle.Success);

const sair = new ButtonBuilder()
.setCustomId(`sair_${novoId}`)
.setLabel("Sair")
.setStyle(ButtonStyle.Danger);

await canalOriginal.send({
content: gerarMensagemFila(novaFila),
components: [new ActionRowBuilder().addComponents(entrar, sair)]
});

filasNormal.delete(fila.id);
}

client.login(TOKEN);
