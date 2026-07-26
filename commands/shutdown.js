const { EmbedBuilder } = require("discord.js");

const FOOTER_TEXT = ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·.";
const BOT_MASTER = "1193517948401373257";

module.exports = {
    name: "shutdown",
    description: "shutdown bot",

    async execute(interaction) {
        if (interaction.user.id !== BOT_MASTER) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#ED0000")
                        .setDescription("you ain't my master, bitch.")
                        .setFooter({ text: FOOTER_TEXT })
                ]
            });
        }

        const embed = new EmbedBuilder()
            .setColor("#ED0000")
            .setDescription("shutting down, bitch.")
            .setFooter({ text: FOOTER_TEXT });

        await interaction.reply({ embeds: [embed] });

        process.exit(0);
    }
};
