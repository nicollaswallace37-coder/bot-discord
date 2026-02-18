const { Client, GatewayIntentBits } = require("discord.js");

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.once("ready", () => {
  console.log("Bot online como " + client.user.tag);
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "teste") {
    await interaction.reply("Está funcionando!");
  }
});

client.login(process.env.TOKEN);
