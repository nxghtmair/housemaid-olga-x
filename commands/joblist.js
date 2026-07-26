const { EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder } = require("discord.js");
const fs = require("fs");

const FOOTER_TEXT = ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·.";
const COOK_ROLE = "1530751512752558131";

function loadJobs() {
    if (!fs.existsSync("./data/jobs.json")) return { users: {} };
    return JSON.parse(fs.readFileSync("./data/jobs.json", "utf8"));
}

function saveJobs(data) {
    fs.writeFileSync("./data/jobs.json", JSON.stringify(data, null, 2));
}

module.exports = {
    name: "joblist",
    description: "see jobs, bitch.",

    async execute(interaction) {
        const userId = interaction.user.id;
        const jobs = loadJobs();

        if (!jobs.users[userId]) {
            jobs.users[userId] = { job: null, lastActivity: 0, completedOrders: 0 };
            saveJobs(jobs);
        }

        const jobInfo = jobs.users[userId];

        const embed = new EmbedBuilder()
            .setColor("#ED0000")
            .setTitle("Job list, bitch.")
            .setDescription(
                `Current job: **${jobInfo.job ? jobInfo.job : "none"}**\n\n` +
                `Pick a job, bitch.`
            )
            .setFooter({ text: FOOTER_TEXT });

        const select = new StringSelectMenuBuilder()
            .setCustomId(`joblist_select_${userId}`)
            .setPlaceholder("Choose job, bitch.")
            .addOptions([
                {
                    label: "Cook",
                    value: "cook",
                    description: "cook food, bitch."
                }
            ]);

        const row = new ActionRowBuilder().addComponents(select);

        return interaction.reply({ embeds: [embed], components: [row] });
    }
};
