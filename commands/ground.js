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
    name: "ground",
    description: "ground a bitch",

    async execute(interaction) {
        const target = interaction.options.getUser("user");
        const duration = interaction.options.getInteger("duration");
        const reason = interaction.options.getString("reason");
        const member = interaction.guild.members.cache.get(target.id);

        let data = loadGround();
        data.users[target.id] = {
            until: Date.now() + duration * 60000,
            reason
        };
        saveGround(data);

        await member.roles.add(MUTE_ROLE);

        const dmEmbed = new EmbedBuilder()
            .setColor("#ED0000")
            .setTitle("you got grounded, bitch.")
            .setDescription(
                `duration: **${duration} minutes**\nreason: **${reason}**`
            )
            .setFooter({ text: FOOTER_TEXT });

        try {
            await target.send({ embeds: [dmEmbed] });
        } catch {}

        const confirm = new EmbedBuilder()
            .setColor("#ED0000")
            .setTitle("grounded that bitch.")
            .setDescription(
                `grounded <@${target.id}> for **${duration} minutes**\nreason: **${reason}**`
            )
            .setFooter({ text: FOOTER_TEXT });

        await interaction.reply({ embeds: [confirm] });

        setTimeout(async () => {
            try {
                await member.roles.remove(MUTE_ROLE);
            } catch {}
        }, duration * 60000);
    }
};
