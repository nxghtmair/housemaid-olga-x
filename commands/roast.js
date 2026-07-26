const { EmbedBuilder } = require("discord.js");

const FOOTER_TEXT = ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·.";

module.exports = {
    name: "roast",
    description: "toggle roast mode",

    async execute(interaction) {
        const mode = interaction.options.getString("mode");
        const client = interaction.client;

        client.roastEnabled = mode === "on";

        const embed = new EmbedBuilder()
            .setColor("#ED0000")
            .setDescription(`roast mode is now **${mode}**, bitch.`)
            .setFooter({ text: FOOTER_TEXT });

        return interaction.reply({ embeds: [embed] });
    }
};
