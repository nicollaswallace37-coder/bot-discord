const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits,
  SlashCommandBuilder,
  REST,
  Routes,
  InteractionType
} = require("discord.js");

const express = require("express");
const app = express();

const TOKEN = "SEU_TOKEN_AQUI";
const CLIENT_ID = "SEU_CLIENT_ID_AQUI";
const GUILD_ID = "SEU_GUILD_ID_AQUI";

const RUSH_CATEGORY_ID = "ID_DA_CATEGORIA_RUSH";

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

let filas = {};


// ================= EXPRESS (RENDER) =================
app.get("/", (req, res) => {
  res.send("Bot online");
});

app.listen(process.env.PORT || 3000);



// ================= COMANDOS =================
const commands = [

  new SlashCommandBuilder()
    .setName("painel")
    .setDescription("Abrir painel fila normal")
    .addStringOption(option =>
      option.setName("modo")
        .setDescription("Modo da fila")
        .setRequired(true)
        .addChoices(
          { name: "1x1", value: "1x1" },
          { name: "2x2", value: "2x2" }
        )
    )
    .addStringOption(option =>
      option.setName("tipo")
        .setDescription("Tipo")
        .setRequired(true)
        .addChoices(
          { name: "Cash", value: "cash" },
          { name: "X1", value: "x1" }
        )
    )
    .addStringOption(option =>
      option.setName("valores")
        .setDescription("Digite até 15 valores separados por vírgula (ex: 10,20,0.20)")
        .setRequired(true)
    ),


  new SlashCommandBuilder()
    .setName("fila-treino")
    .setDescription("Abrir fila de treino")
    .addStringOption(option =>
      option.setName("modo")
        .setDescription("Modo treino")
        .setRequired(true)
        .addChoices(
          { name: "1x1", value: "1x1" },
          { name: "2x2", value: "2x2" }
        )
    )

].map(cmd => cmd.toJSON());



const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );
})();



// ================= READY =================
client.once("ready", () => {
  console.log("Bot online");
});



// ================= INTERAÇÕES =================
client.on("interactionCreate", async interaction => {

  if (interaction.type !== InteractionType.ApplicationCommand &&
      interaction.type !== InteractionType.MessageComponent) return;


  // ================= PAINEL NORMAL =================
  if (interaction.isChatInputCommand() && interaction.commandName === "painel") {

    const modo = interaction.options.getString("modo");
    const tipo = interaction.options.getString("tipo");
    const valoresInput = interaction.options.getString("valores");

    const valores = valoresInput
      .split(",")
      .map(v => v.trim())
      .filter(v => v.length > 0);

    if (valores.length === 0 || valores.length > 15) {
      return interaction.reply({
        content: "Você pode colocar entre 1 e 15 valores.",
        ephemeral: true
      });
    }

    const filaID = Date.now().toString();

    filas[filaID] = {
      modo,
      tipo,
      valores,
      jogadores: []
    };

    const row = new ActionRowBuilder();

    valores.forEach(valor => {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`entrar_${filaID}_${valor}`)
          .setLabel(`R$ ${valor}`)
          .setStyle(ButtonStyle.Primary)
      );
    });

    await interaction.reply({
      content: `🎮 Fila ${modo} | ${tipo}\nEscolha o valor:`,
      components: [row]
    });
  }



  // ================= FILA TREINO =================
  if (interaction.isChatInputCommand() && interaction.commandName === "fila-treino") {

    const modo = interaction.options.getString("modo");

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`treino_${modo}`)
        .setLabel("Entrar na fila de treino")
        .setStyle(ButtonStyle.Success)
    );

    await interaction.reply({
      content: `🏆 Fila de treino ${modo}`,
      components: [row]
    });
  }



  // ================= BOTÕES =================
  if (interaction.isButton()) {

    // ===== FILA NORMAL =====
    if (interaction.customId.startsWith("entrar_")) {

      const [, filaID, valor] = interaction.customId.split("_");
      const fila = filas[filaID];

      if (!fila) return;

      if (fila.jogadores.find(j => j.id === interaction.user.id)) {
        return interaction.reply({ content: "Você já entrou.", ephemeral: true });
      }

      fila.jogadores.push({
        id: interaction.user.id,
        tag: interaction.user.tag
      });

      await interaction.reply({ content: "Você entrou na fila!", ephemeral: true });

      if (fila.jogadores.length === 2) {

        const mediador = fila.jogadores[0];
        const jogador = fila.jogadores[1];

        const canal = await interaction.guild.channels.create({
          name: `rush-${valor}`,
          type: ChannelType.GuildText,
          parent: RUSH_CATEGORY_ID,
          permissionOverwrites: [
            {
              id: interaction.guild.roles.everyone,
              deny: [PermissionFlagsBits.ViewChannel]
            },
            {
              id: mediador.id,
              allow: [PermissionFlagsBits.ViewChannel]
            },
            {
              id: jogador.id,
              allow: [PermissionFlagsBits.ViewChannel]
            }
          ]
        });

        const encerrarBtn = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`encerrar_${canal.id}_${mediador.id}`)
            .setLabel("Encerrar")
            .setStyle(ButtonStyle.Danger)
        );

        await canal.send({
          content: `🎮 Partida iniciada!\nMediador: <@${mediador.id}>\nJogador: <@${jogador.id}>`,
          components: [encerrarBtn]
        });

        delete filas[filaID];
      }
    }



    // ===== TREINO =====
    if (interaction.customId.startsWith("treino_")) {

      await interaction.reply({
        content: "Você entrou na fila de treino!",
        ephemeral: true
      });
    }



    // ===== ENCERRAR =====
    if (interaction.customId.startsWith("encerrar_")) {

      const [, canalID, mediadorID] = interaction.customId.split("_");

      if (interaction.user.id !== mediadorID) {
        return interaction.reply({
          content: "Apenas o mediador pode encerrar.",
          ephemeral: true
        });
      }

      const canal = interaction.guild.channels.cache.get(canalID);

      if (canal) {
        await canal.delete();
      }
    }
  }

});


client.login(TOKEN);
