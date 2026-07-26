const { EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder } = require("discord.js");
const fs = require("fs");

const FOOTER_TEXT = ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·.";
const COOK_ROLE = "1530751512752558131";

function loadJobs() {
    if (!fs.existsSync("./data/jobs.json")) return { users: {} };
    return JSON.parse(fs.readFileSync("./data/jobs.json", "utf8"));
}

module.exports = {
    name: "jobpanel",
    description: "your job panel, bitch.",

    async execute(interaction) {
        const userId = interaction.user.id;
        const jobs = loadJobs();

        if (!jobs.users[userId] || !jobs.users[userId].job) {
            const embed = new EmbedBuilder()
                .setColor("#ED0000")
                .setDescription("you got no job, bitch.")
                .setFooter({ text: FOOTER_TEXT });

            return interaction.reply({ embeds: [embed] });
        }

        const job = jobs.users[userId].job;

        if (job === "cook") {
            const embed = new EmbedBuilder()
                .setColor("#ED0000")
                .setTitle("Cook job panel, bitch.")
                .setDescription(
                    "Use the panel, bitch.\n\n" +
                    "Options:\n" +
                    "- Orders\n" +
                    "- Orders Log"
                )
                .setFooter({ text: FOOTER_TEXT });

            const select = new StringSelectMenuBuilder()
                .setCustomId(`jobpanel_cook_${userId}`)
                .setPlaceholder("Choose panel option, bitch.")
                .addOptions([
                    {
                        label: "Orders",
                        value: "orders",
                        description: "see current orders, bitch."
                    },
                    {
                        label: "Orders Log",
                        value: "orders_log",
                        description: "see completed orders, bitch."
                    }
                ]);

            const row = new ActionRowBuilder().addComponents(select);

            return interaction.reply({ embeds: [embed], components: [row] });
        }

        const embed = new EmbedBuilder()
            .setColor("#ED0000")
            .setDescription("this job ain't got a panel yet, bitch.")
            .setFooter({ text: FOOTER_TEXT });

        return interaction.reply({ embeds: [embed] });
    }
};
