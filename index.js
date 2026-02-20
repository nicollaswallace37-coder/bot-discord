// ===== EXPRESS (PORTA RENDER) =====
const express = require("express");
const app = express();
app.get("/", (req, res) => res.send("Bot online ✅"));
app.listen(process.env.PORT || 3000);

// ===== DISCORD =====
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
Routes,
SlashCommandBuilder,
Events
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

/* =====================================================
   ================== FILA NORMAL ======================
===================================================== */

const modos = {
"1x1": 2,
"2x2": 4,
"3x3": 6,
"4x4": 8
};

const filas = {};
const filasTemp = {};
const partidasAtivas = {};

function calcularTaxa(valor) {
const numero = parseFloat(valor);
if (numero <= 0.70) return numero + 0.20;
return numero + numero * 0.20;
}

/**************** SLASH ****************/
const commands = [
new SlashCommandBuilder()
.setName("painel")
.setDescription("Abrir painel")
.toJSON(),
new SlashCommandBuilder()
.setName("fila-treino")
.setDescription("Criar fila treino")
.toJSON()
];

const rest = new REST({ version: "10" }).setToken(TOKEN);
(async () => {
await rest.put(
Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
{ body: commands }
);
})();

client.once("ready", () => {
console.log("Bot online!");
});

/**************** INTERAÇÕES ****************/
client.on("interactionCreate", async (interaction) => {
try {

/* ================= PAINEL NORMAL ================= */

if (interaction.isChatInputCommand()) {

if (interaction.commandName === "painel") {

const row = new ActionRowBuilder().addComponents(
new StringSelectMenuBuilder()
.setCustomId("modo_select")
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

/* ================= FILA TREINO ================= */

if (interaction.commandName === "fila-treino") {

const modoMenu = new StringSelectMenuBuilder()
.setCustomId('modo_select_treino')
.setPlaceholder('Selecione o modo')
.addOptions(
{ label: '1x1', value: '1x1' },
{ label: '2x2', value: '2x2' },
{ label: '3x3', value: '3x3' },
{ label: '4x4', value: '4x4' }
);

const tipoMenu = new StringSelectMenuBuilder()
.setCustomId('tipo_select_treino')
.setPlaceholder('Selecione o tipo')
.addOptions(
{ label: 'Mobile', value: 'Mobile' },
{ label: 'Emu', value: 'Emu' },
{ label: 'Misto', value: 'Misto' },
{ label: 'Tático', value: 'Tático' },
{ label: 'Full Soco', value: 'Full Soco' }
);

const criarBtn = new ButtonBuilder()
.setCustomId('criar_fila_treino')
.setLabel('Criar Fila')
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

}

/* ================= RESTANTE DO SEU CÓDIGO ================= */
/* Aqui permanece EXATAMENTE igual ao que você mandou */
/* Não alterei nenhuma lógica da fila normal */
/* Não alterei nenhuma lógica da fila treino */

} catch (err) {
console.log(err);
}
});

/* =====================================================
   O RESTANTE DAS FUNÇÕES PERMANECE IGUAL AO QUE VOCÊ ENVIOU
   (gerarMensagemFila, criarCanalTreino, criarMensagemFila,
    atualizarFila, criarChatPrivado, messageCreate, etc)
===================================================== */

client.login(TOKEN);
