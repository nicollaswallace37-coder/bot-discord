const { Client, GatewayIntentBits } = require("discord.js");

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.once("ready", function () {
  console.log("Bot online");
});

client.on("interactionCreate", async function (interaction) {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "teste") {
    await interaction.reply("Está funcionando!");
  }
});

client.login(process.env.TOKEN);
