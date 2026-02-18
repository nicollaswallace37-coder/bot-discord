process.on("unhandledRejection", console.error);
process.on("uncaughtException", console.error);

const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  EmbedBuilder
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

client.once("ready", () => {
  console.log("Bot online como " + client.user.tag);
  client.user.setActivity("Sistema de Filas 🔥");
});

client.on("interactionCreate", async (interaction) => {

  // ===== COMANDO /fila =====
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === "fila") {

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

  // ===== BOTÕES =====
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

  // ===== MENU =====
  if (interaction.isStringSelectMenu()) {

    await interaction.reply({
      content: Você selecionou: ${interaction.values[0]},
      ephemeral: true
    });

  }

});

client.login(process.env.TOKEN);
