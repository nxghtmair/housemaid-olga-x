const { EmbedBuilder } = require("discord.js");

const FOOTER_TEXT = ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·.";

module.exports = {
    name: "kick",
    description: "kick a bitch",

    async execute(interaction) {
        const target = interaction.options.getUser("user");
        const reason = interaction.options.getString("reason") || "no reason, bitch.";
        const member = interaction.guild.members.cache.get(target.id);

        const dmEmbed = new EmbedBuilder()
            .setColor("#ED0000")
            .setTitle("you got kicked, bitch.")
            .setDescription(`reason: **${reason}**`)
            .setFooter({ text: FOOTER_TEXT });

        try {
            await target.send({ embeds: [dmEmbed] });
        } catch {}

        await member.kick(reason);

        const confirm = new EmbedBuilder()
            .setColor("#ED0000")
            .setTitle("kicked that bitch.")
            .setDescription(`kicked <@${target.id}> for **${reason}**`)
            .setFooter({ text: FOOTER_TEXT });

        await interaction.reply({ embeds: [confirm] });
    }
};
