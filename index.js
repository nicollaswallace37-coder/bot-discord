const { 
  Client, 
  GatewayIntentBits, 
  Events, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle 
} = require("discord.js");

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.once(Events.ClientReady, () => {
  console.log(✓ Bot ligado como ${client.user.tag});
});

client.on(Events.InteractionCreate, async interaction => {

  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "criar-fila") {}
});

    const embed = new EmbedBuilder()
    .setTitle("🎮 Criar Filas")
    .setDescription("Clique em iniciar para abrir a fila")
    .addFields(
        {
            name: "🎮 Jogo",
            value: "Free Fire",
            inline: true
        },
        {
            name: "📱 Tipo",
            value: "Mobile",
            inline: true
        },
        {
            name: "🎯 Modo",
            value: "X1",
            inline: true
        },
        {
            name: "💰 Preço",
            value: "R$ 2,50",
            inline: true
        }
    )
    .setColor("Blue");

const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
        .setCustomId("iniciar-fila")
        .setLabel("🎮 Iniciar Fila")
        .setStyle(ButtonStyle.Success)
);

await interaction.reply({
    embeds: [embed],
    components: [row]
});

}
});

client.login(process.env.TOKEN);
