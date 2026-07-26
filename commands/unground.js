const { EmbedBuilder } = require("discord.js");
const fs = require("fs");

const FOOTER_TEXT = ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·.";
const MUTE_ROLE = "1530751898221543424";

function loadGround() {
    if (!fs.existsSync("./data/ground.json")) return { users: {} };
    return JSON.parse(fs.readFileSync("./data/ground.json", "utf8"));
}

function saveGround(data) {
    fs.writeFileSync("./data/ground.json", JSON.stringify(data, null, 2));
}

module.exports = {
    name: "unground",
    description: "unground a bitch",

    async execute(interaction) {
        const target = interaction.options.getUser("user");
        const member = interaction.guild.members.cache.get(target.id);

        let data = loadGround();
        delete data.users[target.id];
        saveGround(data);

        await member.roles.remove(MUTE_ROLE);

        const confirm = new EmbedBuilder()
            .setColor("#ED0000")
            .setTitle("ungrounded that bitch.")
            .setDescription(`freed <@${target.id}>`)
            .setFooter({ text: FOOTER_TEXT });

        await interaction.reply({ embeds: [confirm] });
    }
};
