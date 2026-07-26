const { SlashCommandBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("example")
        .setDescription("example command"),

    async execute(interaction, client, db, helpers) {
        await interaction.reply("example");
    }
};
