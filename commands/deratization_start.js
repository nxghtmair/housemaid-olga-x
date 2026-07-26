const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");

const FOOTER_TEXT = ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·.";

module.exports = {
    name: "deratization_start",
    description: "lock channel",

    async execute(interaction) {
        await interaction.channel.permissionOverwrites.edit(
            interaction.guild.roles.everyone,
            { SendMessages: false }
        );

        const embed = new EmbedBuilder()
            .setColor("#ED0000")
            .setDescription("channel locked, bitch.")
            .setFooter({ text: FOOTER_TEXT });

        return interaction.reply({ embeds: [embed] });
    }
};
