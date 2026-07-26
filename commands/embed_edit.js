const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require("discord.js");

module.exports = {
    name: "embed_edit",
    description: "edit embed",

    async execute(interaction) {
        const msgId = interaction.options.getString("msgid");

        const modal = new ModalBuilder()
            .setCustomId(`embed_edit_${msgId}`)
            .setTitle("Edit embed, bitch.");

        const title = new TextInputBuilder()
            .setCustomId("embed_title")
            .setLabel("New title")
            .setStyle(TextInputStyle.Short);

        const desc = new TextInputBuilder()
            .setCustomId("embed_desc")
            .setLabel("New description")
            .setStyle(TextInputStyle.Paragraph);

        const image = new TextInputBuilder()
            .setCustomId("embed_image")
            .setLabel("New image URL")
            .setStyle(TextInputStyle.Short);

        const footer = new TextInputBuilder()
            .setCustomId("embed_footer")
            .setLabel("New footer")
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
