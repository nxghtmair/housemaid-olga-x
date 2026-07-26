const { EmbedBuilder } = require("discord.js");
const fs = require("fs");

const FOOTER_TEXT = ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·.";

function loadEco() {
    if (!fs.existsSync("./data/economy.json")) return { users: {} };
    return JSON.parse(fs.readFileSync("./data/economy.json", "utf8"));
}

function saveEco(data) {
    fs.writeFileSync("./data/economy.json", JSON.stringify(data, null, 2));
}

module.exports = {
    name: "roll",
    description: "roll your money",

    async execute(interaction) {
        const amount = interaction.options.getInteger("amount");
        const eco = loadEco();
        const user = interaction.user;

        if (!eco.users[user.id]) eco.users[user.id] = { wallet: 0, bank: 0 };

        if (eco.users[user.id].wallet < amount) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#ED0000")
                        .setDescription("you ain't got that much, bitch.")
                        .setFooter({ text: FOOTER_TEXT })
                ]
            });
        }

        const win = Math.random() < 0.5;

        if (win) {
            eco.users[user.id].wallet += amount;
            saveEco(eco);

            const embed = new EmbedBuilder()
                .setColor("#ED0000")
                .setTitle("you won, bitch.")
                .setDescription(`you gained **${amount}** turds.`)
                .setFooter({ text: FOOTER_TEXT });

            return interaction.reply({ embeds: [embed] });
        } else {
            eco.users[user.id].wallet -= amount;
            saveEco(eco);

            const embed = new EmbedBuilder()
                .setColor("#ED0000")
                .setTitle("you lost, bitch.")
                .setDescription(`you lost **${amount}** turds.`)
                .setFooter({ text: FOOTER_TEXT });

            return interaction.reply({ embeds: [embed] });
        }
    }
};
