const { EmbedBuilder } = require("discord.js");
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
    name: "divorce",
    description: "divorce a bitch",

    async execute(interaction) {
        const partner = interaction.options.getUser("user");
        const user = interaction.user;

        let family = loadFamily();

        const before = family.marriages.length;

        family.marriages = family.marriages.filter(
            m => !(
                (m.a === user.id && m.b === partner.id) ||
                (m.a === partner.id && m.b === user.id)
            )
        );

        if (family.marriages.length === before) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#ED0000")
                        .setDescription("you ain't married to this bitch.")
                        .setFooter({ text: FOOTER_TEXT })
                ]
            });
        }

        saveFamily(family);

        const embed = new EmbedBuilder()
            .setColor("#ED0000")
            .setTitle("divorced that bitch.")
            .setDescription(`<@${user.id}> divorced <@${partner.id}>`)
            .setFooter({ text: FOOTER_TEXT });

        return interaction.reply({ embeds: [embed] });
    }
};
