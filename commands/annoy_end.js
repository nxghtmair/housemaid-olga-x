const { EmbedBuilder } = require("discord.js");

const FOOTER_TEXT = ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·.";

module.exports = {
    name: "annoy_end",
    description: "stop annoying a bitch",

    async execute(interaction) {
        const target = interaction.options.getUser("user");
        const client = interaction.client;

        if (!client.annoySessions || !client.annoySessions[target.id]) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#ED0000")
                        .setDescription("this bitch ain't being annoyed.")
                        .setFooter({ text: FOOTER_TEXT })
                ]
            });
        }

        clearInterval(client.annoySessions[target.id].intervalId);
        delete client.annoySessions[target.id];

        const embed = new EmbedBuilder()
            .setColor("#ED0000")
            .setDescription(`stopped annoying <@${target.id}>, bitch.`)
            .setFooter({ text: FOOTER_TEXT });

        return interaction.reply({ embeds: [embed] });
    }
};
