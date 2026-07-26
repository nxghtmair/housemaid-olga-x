const { EmbedBuilder } = require("discord.js");

const FOOTER_TEXT = ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·.";

module.exports = {
    name: "template",
    description: "template command",

    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setColor("#ED0000")
            .setDescription("template executed, bitch.")
            .setFooter({ text: FOOTER_TEXT });

        return interaction.reply({ embeds: [embed] });
    }
};
