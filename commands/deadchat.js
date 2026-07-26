const { EmbedBuilder } = require("discord.js");

const FOOTER_TEXT = ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·.";
const DEADCHAT_ROLE = "1530138181490577558";

module.exports = {
    name: "deadchat",
    description: "toggle deadchat",

    async execute(interaction) {
        const mode = interaction.options.getString("mode");
        const client = interaction.client;

        client.deadchatEnabled = mode === "on";

        const embed = new EmbedBuilder()
            .setColor("#ED0000")
            .setDescription(`deadchat is now **${mode}**, bitch.`)
            .setFooter({ text: FOOTER_TEXT });

        return interaction.reply({ embeds: [embed] });
    }
};
