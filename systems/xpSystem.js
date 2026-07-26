const { EmbedBuilder } = require("discord.js");
const fs = require("fs");

const FOOTER_TEXT = ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·.";
const CHAT_XP_CHANNEL = "1513932845922385920";
const LEVEL_CHANNEL = "1517175386021040138";

const XP_THRESHOLDS = [
    { xp: 0,    role: "1530590724192473240" },
    { xp: 500,  role: "1530588907509514360" },
    { xp: 1000, role: "1530589017140236419" },
    { xp: 1500, role: "1530588839163199540" },
    { xp: 2000, role: "1530588669956722770" },
    { xp: 3000, role: "1530588534606528632" },
    { xp: 10000,role: "1530588478352654407" }
];

function loadXp() {
    if (!fs.existsSync("./data/xpData.json")) return { users: {} };
    return JSON.parse(fs.readFileSync("./data/xpData.json", "utf8"));
}

function saveXp(data) {
    fs.writeFileSync("./data/xpData.json", JSON.stringify(data, null, 2));
}

function getLevelIndex(xp) {
    let idx = 0;
    for (let i = 0; i < XP_THRESHOLDS.length; i++) {
        if (xp >= XP_THRESHOLDS[i].xp) idx = i;
    }
    return idx;
}

module.exports = {
    start(client) {
        client.on("messageCreate", async msg => {
            if (!msg.guild || msg.author.bot) return;
            if (msg.channel.id !== CHAT_XP_CHANNEL) return;

            let xp = loadXp();
            const id = msg.author.id;

            if (!xp.users[id]) xp.users[id] = { xp: 0, messages: 0 };

            xp.users[id].messages++;
            xp.users[id].xp += 5;

            const oldLevel = getLevelIndex(xp.users[id].xp - 5);
            const newLevel = getLevelIndex(xp.users[id].xp);

            saveXp(xp);

            if (newLevel > oldLevel) {
                const guild = msg.guild;
                const member = guild.members.cache.get(id);

                const newRole = XP_THRESHOLDS[newLevel].role;
                const oldRole = XP_THRESHOLDS[oldLevel].role;

                try {
                    await member.roles.remove(oldRole).catch(() => {});
                    await member.roles.add(newRole).catch(() => {});
                } catch {}

                const embed = new EmbedBuilder()
                    .setColor("#ED0000")
                    .setTitle("leveled up, bitch.")
                    .setDescription(
                        `<@${id}> just leveled up.\n\nnew role: <@&${newRole}>\nxp: **${xp.users[id].xp}**`
                    )
                    .setFooter({ text: FOOTER_TEXT });

                const channel = guild.channels.cache.get(LEVEL_CHANNEL);
                if (channel) channel.send({ content: `<@${id}>`, embeds: [embed] });
            }
        });
    }
};
