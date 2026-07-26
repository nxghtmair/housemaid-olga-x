const { EmbedBuilder } = require("discord.js");

const FOOTER_TEXT = ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·.";

module.exports = {
    name: "bot_lock",
    description: "lock bot",

    async execute(interaction) {
        interaction.client.botLocked = true;

        const embed = new EmbedBuilder()
            .setColor("#ED0000")
            .setDescription("bot locked, bitch.")
            .setFooter({ text: FOOTER_TEXT });

        return interaction.reply({ embeds: [embed] });
    }
};
