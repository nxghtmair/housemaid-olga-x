const { EmbedBuilder } = require("discord.js");

const FOOTER_TEXT = ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·.";

module.exports = {
    name: "annoy_start",
    description: "start annoying a bitch",

    async execute(interaction) {
        const target = interaction.options.getUser("user");
        const duration = interaction.options.getInteger("duration");

        const client = interaction.client;
        client.annoySessions = client.annoySessions || {};

        if (client.annoySessions[target.id]) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#ED0000")
                        .setDescription("already annoying this bitch.")
                        .setFooter({ text: FOOTER_TEXT })
                ]
            });
        }

        const intervalId = setInterval(async () => {
            try {
                const embed = new EmbedBuilder()
                    .setColor("#ED0000")
                    .setDescription(`<@${target.id}> -annoying noises-`)
                    .setFooter({ text: FOOTER_TEXT });

                await interaction.channel.send({ embeds: [embed] });
            } catch {}
        }, 5000);

        client.annoySessions[target.id] = {
            intervalId,
            endAt: Date.now() + duration * 1000
        };

        setTimeout(() => {
            clearInterval(intervalId);
            delete client.annoySessions[target.id];
        }, duration * 1000);

        const embed = new EmbedBuilder()
            .setColor("#ED0000")
            .setDescription(`annoying <@${target.id}> for **${duration} seconds**, bitch.`)
            .setFooter({ text: FOOTER_TEXT });

        return interaction.reply({ embeds: [embed] });
    }
};
