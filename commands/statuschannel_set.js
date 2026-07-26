const { EmbedBuilder } = require("discord.js");

const FOOTER_TEXT = ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·.";

module.exports = {
    name: "statuschannel_set",
    description: "set status channel",

    async execute(interaction) {
        const attachment = interaction.options.getAttachment("image");
        const client = interaction.client;

        client.statusConfig = client.statusConfig || {};
        client.statusConfig.channelId = interaction.channel.id;
        client.statusConfig.image = attachment ? attachment.url : null;

        const embed = new EmbedBuilder()
            .setColor("#ED0000")
            .setDescription("status channel set, bitch.")
            .setFooter({ text: FOOTER_TEXT });

        return interaction.reply({ embeds: [embed] });
    }
};
