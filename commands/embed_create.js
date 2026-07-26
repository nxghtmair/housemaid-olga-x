const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require("discord.js");

module.exports = {
    name: "embed_create",
    description: "create embed",

    async execute(interaction) {
        const modal = new ModalBuilder()
            .setCustomId("embed_modal")
            .setTitle("Create embed, bitch.");

        const title = new TextInputBuilder()
            .setCustomId("embed_title")
            .setLabel("Title")
            .setStyle(TextInputStyle.Short);

        const desc = new TextInputBuilder()
            .setCustomId("embed_desc")
            .setLabel("Description")
            .setStyle(TextInputStyle.Paragraph);

        const image = new TextInputBuilder()
            .setCustomId("embed_image")
            .setLabel("Image URL")
            .setStyle(TextInputStyle.Short);

        const footer = new TextInputBuilder()
            .setCustomId("embed_footer")
            .setLabel("Footer")
            .setStyle(TextInputStyle.Short);

        modal.addComponents(
            new ActionRowBuilder().addComponents(title),
            new ActionRowBuilder().addComponents(desc),
            new ActionRowBuilder().addComponents(image),
            new ActionRowBuilder().addComponents(footer)
        );

        return interaction.showModal(modal);
    }
};
