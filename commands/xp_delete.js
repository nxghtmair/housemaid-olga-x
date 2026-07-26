const { EmbedBuilder } = require("discord.js");
const fs = require("fs");

const FOOTER_TEXT = ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·.";

function loadXp() {
    if (!fs.existsSync("./data/xpData.json")) return { users: {} };
    return JSON.parse(fs.readFileSync("./data/xpData.json", "utf8"));
}

function saveXp(data) {
    fs.writeFileSync("./data/xpData.json", JSON.stringify(data, null, 2));
}

module.exports = {
    name: "xp_delete",
    description: "delete user xp",

    async execute(interaction) {
        const target = interaction.options.getUser("user");
        let xp = loadXp();

        xp.users[target.id] = { xp: 0, messages: 0 };
        saveXp(xp);

        const embed = new EmbedBuilder()
            .setColor("#ED0000")
            .setDescription(`deleted xp of <@${target.id}>, bitch.`)
            .setFooter({ text: FOOTER_TEXT });

        return interaction.reply({ embeds: [embed] });
    }
};
