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
    name: "crime",
    description: "commit crime for turds",

    async execute(interaction) {
        const eco = loadEco();
        const user = interaction.user;

        if (!eco.users[user.id]) eco.users[user.id] = { wallet: 0, bank: 0 };

        const success = Math.random() < 0.5;

        if (success) {
            const amount = Math.floor(Math.random() * 50) + 10;
            eco.users[user.id].wallet += amount;
            saveEco(eco);

            const embed = new EmbedBuilder()
                .setColor("#ED0000")
                .setTitle("crime successful, bitch.")
                .setDescription(`you stole **${amount}** turds.`)
                .setFooter({ text: FOOTER_TEXT });

            return interaction.reply({ embeds: [embed] });
        } else {
            const loss = Math.floor(Math.random() * 20) + 5;
            eco.users[user.id].wallet = Math.max(0, eco.users[user.id].wallet - loss);
            saveEco(eco);

            const embed = new EmbedBuilder()
                .setColor("#ED0000")
                .setTitle("you got caught, bitch.")
                .setDescription(`you lost **${loss}** turds.`)
                .setFooter({ text: FOOTER_TEXT });

            return interaction.reply({ embeds: [embed] });
        }
    }
};
