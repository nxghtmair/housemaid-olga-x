const { EmbedBuilder } = require("discord.js");

const FOOTER_TEXT = ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·.";

module.exports = {
    name: "deratization_end",
    description: "unlock channel",

    async execute(interaction) {
        await interaction.channel.permissionOverwrites.edit(
            interaction.guild.roles.everyone,
            { SendMessages: true }
        );

        const embed = new EmbedBuilder()
            .setColor("#ED0000")
            .setDescription("channel unlocked, bitch.")
            .setFooter({ text: FOOTER_TEXT });

        return interaction.reply({ embeds: [embed] });
    }
};
