const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const fs = require("fs");

const FOOTER_TEXT = ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·.";

function loadFamily() {
    if (!fs.existsSync("./data/family.json")) return { marriages: [], parents: [] };
    return JSON.parse(fs.readFileSync("./data/family.json", "utf8"));
}

function saveFamily(data) {
    fs.writeFileSync("./data/family.json", JSON.stringify(data, null, 2));
}

module.exports = {
    name: "marry",
    description: "marry a bitch",

    async execute(interaction) {
        const partner = interaction.options.getUser("user");
        const user = interaction.user;

        if (partner.id === user.id) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#ED0000")
                        .setDescription("you can't marry yourself, bitch.")
                        .setFooter({ text: FOOTER_TEXT })
                ]
            });
        }

        const family = loadFamily();

        // Already married?
        if (family.marriages.some(m =>
            (m.a === user.id && m.b === partner.id) ||
            (m.a === partner.id && m.b === user.id)
        )) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#ED0000")
                        .setDescription("you already married this bitch.")
                        .setFooter({ text: FOOTER_TEXT })
                ]
            });
        }

        // Confirmation embed
        const embed = new EmbedBuilder()
            .setColor("#ED0000")
            .setTitle("marriage request, bitch.")
            .setDescription(`<@${partner.id}> do you accept <@${user.id}>?`)
            .setFooter({ text: FOOTER_TEXT });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`family_marry_yes_${user.id}_${partner.id}`)
                .setLabel("yes bitch")
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId(`family_marry_no_${user.id}_${partner.id}`)
                .setLabel("no bitch")
                .setStyle(ButtonStyle.Danger)
        );

        await interaction.reply({ embeds: [embed], components: [row] });
    }
};
