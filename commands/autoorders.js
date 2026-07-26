const { EmbedBuilder } = require("discord.js");

const FOOTER_TEXT = ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·.";

module.exports = {
    name: "autoorders",
    description: "toggle auto orders",

    async execute(interaction) {
        const client = interaction.client;

        client.autoOrders = !client.autoOrders;

        const embed = new EmbedBuilder()
            .setColor("#ED0000")
            .setDescription(`auto orders are now **${client.autoOrders ? "on" : "off"}**, bitch.`)
            .setFooter({ text: FOOTER_TEXT });

        return interaction.reply({ embeds: [embed] });
    }
};
