const { EmbedBuilder } = require("discord.js");
const fs = require("fs");

const FOOTER_TEXT = ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·.";

function loadFamily() {
    if (!fs.existsSync("./data/family.json")) return { marriages: [], parents: [] };
    return JSON.parse(fs.readFileSync("./data/family.json", "utf8"));
}

module.exports = {
    name: "familytree",
    description: "show your family tree",

    async execute(interaction) {
        const user = interaction.user;
        const family = loadFamily();

        const marriedTo = family.marriages
            .filter(m => m.a === user.id || m.b === user.id)
            .map(m => m.a === user.id ? m.b : m.a);

        const parents = family.parents
            .filter(p => p.child === user.id)
            .map(p => p.parent);

        const children = family.parents
            .filter(p => p.parent === user.id)
            .map(p => p.child);

        const embed = new EmbedBuilder()
            .setColor("#ED0000")
            .setTitle(`Family tree of <@${user.id}>, bitch.`)
            .setDescription(
                `**Married to:**\n${marriedTo.length ? marriedTo.map(id => `<@${id}>`).join("\n") : "none, bitch."}\n\n` +
                `**Parents:**\n${parents.length ? parents.map(id => `<@${id}>`).join("\n") : "none, bitch."}\n\n` +
                `**Children:**\n${children.length ? children.map(id => `<@${id}>`).join("\n") : "none, bitch."}`
            )
            .setFooter({ text: FOOTER_TEXT });

        return interaction.reply({ embeds: [embed] });
    }
};
