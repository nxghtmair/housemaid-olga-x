const { EmbedBuilder, PermissionFlagsBits, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require("discord.js");

const FOOTER_TEXT = ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·.";

module.exports = {
    name: "ban",
    description: "ban a bitch",

    async execute(interaction) {
        const target = interaction.options.getUser("user");
        const reason = interaction.options.getString("reason") || "no reason, bitch.";
        const member = interaction.guild.members.cache.get(target.id);

        const dmEmbed = new EmbedBuilder()
            .setColor("#ED0000")
            .setTitle("you got banned, bitch.")
            .setDescription(`reason: **${reason}**`)
            .setFooter({ text: FOOTER_TEXT });

        const button = new ButtonBuilder()
            .setLabel(`Sent with lots of hate from: ${interaction.member.displayName}`)
            .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder().addComponents(button);

        try {
            await target.send({ embeds: [dmEmbed], components: [row] });
        } catch {}

        await member.ban({ reason });

        const confirm = new EmbedBuilder()
            .setColor("#ED0000")
            .setTitle("banned that bitch.")
            .setDescription(`banned <@${target.id}> for **${reason}**`)
            .setFooter({ text: FOOTER_TEXT });

        await interaction.reply({ embeds: [confirm] });
    }
};
