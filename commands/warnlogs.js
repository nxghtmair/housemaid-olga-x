const { EmbedBuilder } = require("discord.js");
const fs = require("fs");

const FOOTER_TEXT = ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·.";

function loadWarns() {
    if (!fs.existsSync("./data/warns.json")) return { users: {} };
    return JSON.parse(fs.readFileSync("./data/warns.json", "utf8"));
}

module.exports = {
    name: "warnlogs",
    description: "show warn logs",

    async execute(interaction) {
        const target = interaction.options.getUser("user");
        const warns = loadWarns();

        const logs = warns.users[target.id] || [];

        if (logs.length === 0) {
            const embed = new EmbedBuilder()
                .setColor("#ED0000")
                .setDescription(`<@${target.id}> has no warns, bitch.`)
                .setFooter({ text: FOOTER_TEXT });

            return interaction.reply({ embeds: [embed] });
        }

        const desc = logs
            .map((w, i) => `**#${i + 1}** – reason: ${w.reason} – by <@${w.moderatorId}>`)
            .join("\n");

        const embed = new EmbedBuilder()
            .setColor("#ED0000")
            .setTitle(`Warn logs for <@${target.id}>, bitch.`)
            .setDescription(desc)
            .setFooter({ text: FOOTER_TEXT });

        return interaction.reply({ embeds: [embed] });
    }
};
