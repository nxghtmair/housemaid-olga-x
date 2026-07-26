const { EmbedBuilder, PermissionFlagsBits, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require("discord.js");
const fs = require("fs");

const FOOTER_TEXT = ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·.";

function loadWarns() {
    if (!fs.existsSync("./data/warns.json")) return { users: {} };
    return JSON.parse(fs.readFileSync("./data/warns.json", "utf8"));
}

function saveWarns(data) {
    fs.writeFileSync("./data/warns.json", JSON.stringify(data, null, 2));
}

module.exports = {
    name: "warn",
    description: "warn a bitch",

    async execute(interaction) {
        const target = interaction.options.getUser("user");
        const reason = interaction.options.getString("reason");
        const moderator = interaction.user;

        let warns = loadWarns();
        if (!warns.users[target.id]) warns.users[target.id] = [];

        warns.users[target.id].push({
            moderatorId: moderator.id,
            reason,
            timestamp: Date.now()
        });

        saveWarns(warns);

        // DM embed
        const dmEmbed = new EmbedBuilder()
            .setColor("#ED0000")
            .setTitle("you got warned, bitch.")
            .setDescription(`reason: **${reason}**`)
            .setFooter({ text: FOOTER_TEXT });

        const button = new ButtonBuilder()
            .setLabel(`Sent with lots of hate from: ${interaction.member.displayName}`)
            .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder().addComponents(button);

        try {
            await target.send({ embeds: [dmEmbed], components: [row] });
        } catch {}

        // Confirm embed
        const confirm = new EmbedBuilder()
            .setColor("#ED0000")
            .setTitle("warned that bitch.")
            .setDescription(`warned <@${target.id}> for **${reason}**`)
            .setFooter({ text: FOOTER_TEXT });

        await interaction.reply({ embeds: [confirm] });
    }
};
