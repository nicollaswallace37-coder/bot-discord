process.on("unhandledRejection", console.error);
process.on("uncaughtException", console.error);

const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder
} = require("discord.js");

const express = require("express");
const app = express();
const PORT = process.env.PORT || 10000;

app.get("/", (req, res) => {
  res.status(200).send("OK");
});

app.listen(PORT, () => {
  console.log("Servidor web rodando");
});

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// ===== REGISTRO DE COMANDOS =====
const commands = [
  new SlashCommandBuilder()
    .setName("criar_fila")
    .setDescription("Criar painel de fila"),

  new SlashCommandBuilder()
    .setName("teste")
    .setDescription("Comando de teste")
].map(command => command.toJSON());

client.once("ready", async () => {
  console.log("Bot online como " + client.user.tag);

  const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);
  const GUILD_ID = "1473169041890742347";

  try {
    await rest.put(
      Routes.applicationGuildCommands(client.user.id, GUILD_ID),
      { body: commands }
    );

    console.log("Comandos registrados no servidor!");
  } catch (error) {
    console.error(error);
  }
});

// ===== INTERAÇÕES =====
client.on("interactionCreate", async (interaction) => {

  // COMANDO
  if (interaction.isChatInputCommand()) {

    if (interaction.commandName === "teste") {
      await interaction.reply("Está funcionando 🚀");
    }

    if (interaction.commandName === "criar_fila") {

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

      const menu = new StringSelectMenuBuilder()
        .setCustomId("menu_config")
        .setPlaceholder("Selecionar opção")
        .addOptions([
          { label: "Jogo", value: "jogo" },
          { label: "Tipo", value: "tipo" },
          { label: "Modo", value: "modo" },
          { label: "Preço", value: "preco" }
        ]);

      const buttons = new ActionRowBuilder().addComponents(
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
        components: [
          new ActionRowBuilder().addComponents(menu),
          buttons
        ]
      });
    }
  }

  // BOTÕES
  if (interaction.isButton()) {

    if (interaction.customId === "iniciar") {
      await interaction.reply({
        content: "✅ Fila iniciada com sucesso!",
        ephemeral: true
      });
    }

    if (interaction.customId === "cancelar") {
      await interaction.message.delete();
    }
  }

  // MENU
  if (interaction.isStringSelectMenu()) {
    await interaction.reply({
      content: Você selecionou: ${interaction.values[0]},
      ephemeral: true
    });
  }

});

client.login(process.env.TOKEN);
