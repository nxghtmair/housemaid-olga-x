const { EmbedBuilder } = require("discord.js");

const FOOTER_TEXT = ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·.";

function makeEmbed(description, title = null) {
    const embed = new EmbedBuilder()
        .setColor("#ED0000")
        .setDescription(description)
        .setFooter({ text: FOOTER_TEXT });

    if (title) embed.setTitle(title);
    return embed;
}

module.exports = { makeEmbed, FOOTER_TEXT };
