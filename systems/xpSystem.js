const { XP_THRESHOLDS, getLevelIndexFromXp } = require("../utils/xpUtils");
const { makeEmbed } = require("../utils/embeds");

const CHAT_XP_CHANNEL = "1513932845922385920";
const LEVEL_CHANNEL = "1517175386021040138";

module.exports = {
    start(client, xpData, saveJson) {

        const wrongChannelWarnings = new Map();

        client.on("messageCreate", async msg => {
            if (!msg.guild || msg.author.bot) return;

            const userId = msg.author.id;

            // XP only in chat XP channel
            if (msg.channel.id !== CHAT_XP_CHANNEL) return;

            // Commands in XP channel = punish
            if (msg.content.startsWith("/")) {

                if (!wrongChannelWarnings.has(userId)) {
                    wrongChannelWarnings.set(userId, 1);

                    return msg.reply({
                        embeds: [makeEmbed("dont use commands here bitch")]
                    });
                }

                const member = msg.guild.members.cache.get(userId);
                if (member) {
                    await member.timeout(5 * 60 * 1000, "learn how to use channels bitch");
                }

                return msg.reply({
                    embeds: [makeEmbed("you grounded for 5 mins bitch")]
                });
            }

            // XP gain (NO MESSAGE HERE)
            const user = xpData.users[userId] || { xp: 0, messages: 0 };
            user.messages++;
            user.xp += 5;
            xpData.users[userId] = user;
            saveJson("./data/xpData.json", xpData);

            // Level-up check
            const oldLevel = getLevelIndexFromXp(user.xp - 5);
            const newLevel = getLevelIndexFromXp(user.xp);

            if (newLevel > oldLevel) {
                const guild = msg.guild;

                const currentThreshold = XP_THRESHOLDS[newLevel];
                const nextThreshold = XP_THRESHOLDS[newLevel + 1] || null;

                const nextXp = nextThreshold ? nextThreshold.xp - user.xp : 0;

                const embed = makeEmbed(
                    `<@${userId}> leveled up bitch\n\n` +
                    `new rank: **level ${newLevel}**\n` +
                    (nextThreshold
                        ? `xp until next rank: **${nextXp}**`
                        : `you at the top bitch`)
                );

                const levelChannel = guild.channels.cache.get(LEVEL_CHANNEL);
                if (levelChannel) {
                    await levelChannel.send({
                        content: `<@${userId}>`,
                        embeds: [embed]
                    });
                }
            }
        });
    }
};
