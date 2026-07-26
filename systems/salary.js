const { makeEmbed } = require("../utils/embeds");

const COOK_ROLE = "1530751512752558131";
const SALARY_CHANNEL = "1517175386021040138";

module.exports = {
    start(client, jobsData, economyData, saveJson) {

        setInterval(async () => {
            try {
                const guilds = client.guilds.cache;

                for (const [, guild] of guilds) {
                    const salaryChannel = guild.channels.cache.get(SALARY_CHANNEL);
                    if (!salaryChannel) continue;

                    await guild.members.fetch();

                    for (const userId in jobsData.users) {
                        const jobInfo = jobsData.users[userId];
                        if (jobInfo.job !== "cook") continue;

                        const eco = economyData.users[userId] || { wallet: 0, bank: 0 };
                        eco.wallet += 2;
                        economyData.users[userId] = eco;
                        saveJson("./data/economy.json", economyData);

                        const embed = makeEmbed(
                            `<@&${COOK_ROLE}> hourly salary dropped bitch\n` +
                            `<@${userId}> got **2** turds for being a cook`
                        );

                        await salaryChannel.send({
                            content: `<@&${COOK_ROLE}>`,
                            embeds: [embed]
                        });
                    }
                }
            } catch (e) {
                console.error("Salary error:", e);
            }
        }, 60 * 60 * 1000);
    }
};
