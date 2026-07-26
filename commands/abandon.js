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
    name: "abandon",
    description: "abandon a bitch",

    async execute(interaction) {
        const child = interaction.options.getUser("user");
        const parent = interaction.user;

        let family = loadFamily();

        const before = family.parents.length;

        family.parents = family.parents.filter(
            p => !(p.parent === parent.id && p.child === child.id)
        );

        if (family.parents.length === before) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#ED0000")
                        .setDescription("you ain't parent of this bitch.")
                        .setFooter({ text: FOOTER_TEXT })
                ]
            });
        }

        saveFamily(family);

        const embed = new EmbedBuilder()
            .setColor("#ED0000")
            .setTitle("abandoned that bitch.")
            .setDescription(`<@${parent.id}> abandoned <@${child.id}>`)
            .setFooter({ text: FOOTER_TEXT });

        return interaction.reply({ embeds: [embed] });
    }
};
