require('dotenv').config(); const { REST, Routes, SlashCommandBuilder } = 
require('discord.js'); const commands = [
    new SlashCommandBuilder() .setName('fila') .setDescription('Criar uma 
        fila'),
    new SlashCommandBuilder() .setName('teste') .setDescription('Comando de 
        teste')
].map(command => command.toJSON()); const rest = new REST({ version: '10' 
}).setToken(process.env.TOKEN);
(async () => { try { console.log('Registrando comandos...'); await 
        rest.put(
            Routes.applicationGuildCommands( process.env.CLIENT_ID, 
                process.env.GUILD_ID
            ), { body: commands } ); console.log('Comandos registrados com 
        sucesso!');
    } catch (error) {
        console.error(error);
    }
})();
