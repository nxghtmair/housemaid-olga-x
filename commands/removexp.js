const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { makeEmbed } = require("../utils/embeds");
const { XP_THRESHOLDS } = require("../utils/xpUtils");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("removexp")
        .setDescription("remove xp bitch")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(s =>
            s.setName("user")
                .setDescription("remove xp from user bitch")
                .addUserOption(o =>
                    o.setName("target")
                        .setDescription("who bitch")
                        .setRequired(true)
                )
                .addIntegerOption(o =>
                    o.setName("amount")
                        .setDescription("how much xp bitch")
                        .setRequired(true)
                )
        )
        .addSubcommand(s =>
            s.setName("everyone")
                .setDescription("wipe xp from everyone bitch")
        ),

    async execute(interaction, client, db, helpers) {
        const { xpData, saveJson } = db;

        const sub = interaction.options.getSubcommand();

        if (sub === "user") {
            const target = interaction.options.getUser("target");
            const amount = interaction.options.getInteger("amount");

            const user = xpData.users[target.id] || { xp: 0, messages: 0 };
            user.xp = Math.max(0, user.xp - amount);
            xpData.users[target.id] = user;
            saveJson("./data/xpData.json", xpData);

            const embed = makeEmbed(
                `removed **${amount}** xp from <@${target.id}> bitch\n` +
                `new xp: **${user.xp}**`
            , "XP Removed");

            return interaction.reply({ embeds: [embed] });
        }

        if (sub === "everyone") {
            for (const id in xpData.users) {
                xpData.users[id].xp = 0;
            }
            saveJson("./data/xpData.json", xpData);

            const embed = makeEmbed(
                "wiped xp from everyone bitch",
                "XP Wipe"
            );

            return interaction.reply({ embeds: [embed] });
        }
    }
};
