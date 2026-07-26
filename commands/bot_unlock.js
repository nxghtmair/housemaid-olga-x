const { EmbedBuilder } = require("discord.js");

const FOOTER_TEXT = ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·.";

module.exports = {
    name: "bot_unlock",
    description: "unlock bot",

    async execute(interaction) {
        interaction.client.botLocked = false;

        const embed = new EmbedBuilder()
            .setColor("#ED0000")
            .setDescription("bot unlocked, bitch.")
            .setFooter({ text: FOOTER_TEXT });

        return interaction.reply({ embeds: [embed] });
    }
};
