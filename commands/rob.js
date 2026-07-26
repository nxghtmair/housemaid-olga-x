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
    name: "rob",
    description: "rob a bitch",

    async execute(interaction) {
        const target = interaction.options.getUser("user");
        const user = interaction.user;

        if (target.id === user.id) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#ED0000")
                        .setDescription("you can't rob yourself, bitch.")
                        .setFooter({ text: FOOTER_TEXT })
                ]
            });
        }

        const eco = loadEco();

        if (!eco.users[target.id]) eco.users[target.id] = { wallet: 0, bank: 0 };
        if (!eco.users[user.id]) eco.users[user.id] = { wallet: 0, bank: 0 };

        const success = Math.random() < 0.5;

        if (success) {
            const amount = Math.floor(Math.random() * eco.users[target.id].wallet);
            eco.users[target.id].wallet -= amount;
            eco.users[user.id].wallet += amount;

            saveEco(eco);

            const embed = new EmbedBuilder()
                .setColor("#ED0000")
                .setTitle("rob successful, bitch.")
                .setDescription(`you stole **${amount}** turds from <@${target.id}>.`)
                .setFooter({ text: FOOTER_TEXT });

            return interaction.reply({ embeds: [embed] });
        } else {
            const loss = Math.floor(Math.random() * 20) + 5;
            eco.users[user.id].wallet = Math.max(0, eco.users[user.id].wallet - loss);

            saveEco(eco);

            const embed = new EmbedBuilder()
                .setColor("#ED0000")
                .setTitle("rob failed, bitch.")
                .setDescription(`you lost **${loss}** turds.`)
                .setFooter({ text: FOOTER_TEXT });

            return interaction.reply({ embeds: [embed] });
        }
    }
};
