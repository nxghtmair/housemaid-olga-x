const { EmbedBuilder } = require("discord.js");
const fs = require("fs");

const FOOTER_TEXT = ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·.";

function loadEco() {
    if (!fs.existsSync("./data/economy.json")) return { users: {} };
    return JSON.parse(fs.readFileSync("./data/economy.json", "utf8"));
}

module.exports = {
    name: "cash",
    description: "show your filthy money, bitch.",

    async execute(interaction) {
        const eco = loadEco();
        const user = interaction.user;

        if (!eco.users[user.id]) eco.users[user.id] = { wallet: 0, bank: 0 };

        const { wallet, bank } = eco.users[user.id];

        const embed = new EmbedBuilder()
            .setColor("#ED0000")
            .setTitle("Your filthy money, bitch.")
            .setDescription(
                `Wallet: **${wallet}** turds\n` +
                `Bank: **${bank}** turds`
            )
            .setFooter({ text: FOOTER_TEXT });

        return interaction.reply({ embeds: [embed] });
    }
};
