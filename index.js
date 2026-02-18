const { 
  Client, 
  GatewayIntentBits, 
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  Events,
  SlashCommandBuilder,
  REST,
  Routes
} = require("discord.js");

const express = require("express");
const app = express();
const PORT = process.env.PORT;

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

app.get("/", (req, res) => {
  res.send("Bot online!");
});

app.listen(PORT, () => {
  console.log("Servidor rodando na porta " + PORT);
});
client.once("ready", async () => {
  console.log("Bot online!");

  const commands = [
    new SlashCommandBuilder()
      .setName("criar-fila")
      .setDescription("Criar sistema de filas")
  ].map(cmd => cmd.toJSON());

  const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

  await rest.put(
    Routes.applicationCommands(client.user.id),
    { body: commands }
  );

  console.log("Comando registrado!");
});
client.on(Events.InteractionCreate, async interaction => {

  if (interaction.isChatInputCommand()) {

    if (interaction.commandName === "criar-fila") {

      const embed = new EmbedBuilder()
        .setTitle("📚 Criar Filas")
        .setDescription("Selecione uma opção para configurar")
        .addFields(
          { name: "🎮 Jogo", value: "Free Fire", inline: true },
          { name: "📱 Tipo", value: "Mobile", inline: true },
          { name: "🎯 Modo", value: "1x1", inline: true },
          { name: "💰 Preço", value: "R$ 2,50", inline: true }
        )
        .setColor("Blue");

      const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("iniciar")
          .setLabel("Iniciar Filas")
          .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
          .setCustomId("cancelar")
          .setLabel("Cancelar")
          .setStyle(ButtonStyle.Danger)
      );

      await interaction.reply({
        embeds: [embed],
        components: [row1]
      });
    }
  }

  if (interaction.isButton()) {

    if (interaction.customId === "cancelar") {
      await interaction.update({
        content: "❌ Sistema cancelado.",
        embeds: [],
        components: []
      });
    }

    if (interaction.customId
