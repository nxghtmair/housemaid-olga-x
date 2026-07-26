const { EmbedBuilder } = require("discord.js");

const FOOTER_TEXT = ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·.";
const PIC_CHANNEL = "1530313495906750615";

module.exports = {
    name: "pic_submit",
    description: "submit a pic",

    async execute(interaction) {
        const attachment = interaction.options.getAttachment("image");

        if (!attachment) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#ED0000")
                        .setDescription("no pic, bitch.")
                        .setFooter({ text: FOOTER_TEXT })
                ]
            });
        }

        const channel = interaction.guild.channels.cache.get(PIC_CHANNEL);

        const embed = new EmbedBuilder()
            .setColor("#ED0000")
            .setTitle("new pic submitted, bitch.")
            .setImage(attachment.url)
            .setFooter({ text: FOOTER_TEXT });

        await channel.send({ embeds: [embed] });

        return interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor("#ED0000")
                    .setDescription("pic submitted, bitch.")
                    .setFooter({ text: FOOTER_TEXT })
            ]
        });
    }
};
