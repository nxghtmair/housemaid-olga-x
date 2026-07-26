const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { makeEmbed } = require("../utils/embeds");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("autoorders")
        .setDescription("toggle auto orders bitch")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addStringOption(o =>
            o.setName("mode")
                .setDescription("on or off bitch")
                .setRequired(true)
                .addChoices(
                    { name: "on", value: "on" },
                    { name: "off", value: "off" }
                )
        ),

    async execute(interaction, client, db, helpers) {
        const mode = interaction.options.getString("mode");

        if (!client.autoOrdersSystem) {
            client.autoOrdersSystem = require("../systems/autoOrders");
        }

        if (mode === "on") {
            client.autoOrdersSystem.setEnabled(true);
            const embed = makeEmbed("autoorders turned **on** bitch", "Autoorders");
            return interaction.reply({ embeds: [embed] });
        }

        if (mode === "off") {
            client.autoOrdersSystem.setEnabled(false);
            const embed = makeEmbed("autoorders turned **off** bitch", "Autoorders");
            return interaction.reply({ embeds: [embed] });
        }
    }
};
