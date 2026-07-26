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
    name: "adopt",
    description: "adopt a bitch",

    async execute(interaction) {
        const child = interaction.options.getUser("user");
        const parent = interaction.user;

        if (child.id === parent.id) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#ED0000")
                        .setDescription("you can't adopt yourself, bitch.")
                        .setFooter({ text: FOOTER_TEXT })
                ]
            });
        }

        const family = loadFamily();

        // Already parent?
        if (family.parents.some(p => p.parent === parent.id && p.child === child.id)) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#ED0000")
                        .setDescription("you already adopted this bitch.")
                        .setFooter({ text: FOOTER_TEXT })
                ]
            });
        }

        const embed = new EmbedBuilder()
            .setColor("#ED0000")
            .setTitle("adoption request, bitch.")
            .setDescription(`<@${child.id}> do you accept <@${parent.id}> as your parent?`)
            .setFooter({ text: FOOTER_TEXT });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`family_adopt_yes_${parent.id}_${child.id}`)
                .setLabel("yes bitch")
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId(`family_adopt_no_${parent.id}_${child.id}`)
                .setLabel("no bitch")
                .setStyle(ButtonStyle.Danger)
        );

        await interaction.reply({ embeds: [embed], components: [row] });
    }
};
