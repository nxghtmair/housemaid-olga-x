const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const fs = require("fs");

const FOOTER_TEXT = ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·.";

function loadEco() {
    if (!fs.existsSync("./data/economy.json")) return { users: {} };
    return JSON.parse(fs.readFileSync("./data/economy.json", "utf8"));
}

function saveEco(data) {
    fs.writeFileSync("./data/economy.json", JSON.stringify(data, null, 2));
}

function drawCard() {
    const values = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    return values[Math.floor(Math.random() * values.length)];
}

function handValue(hand) {
    let sum = hand.reduce((a, b) => a + b, 0);
    let aces = hand.filter(v => v === 11).length;
    while (sum > 21 && aces > 0) {
        sum -= 10;
        aces--;
    }
    return sum;
}

module.exports = {
    name: "blackjack",
    description: "play blackjack for turds",

    async execute(interaction) {
        const eco = loadEco();
        const user = interaction.user;

        if (!eco.users[user.id]) eco.users[user.id] = { wallet: 0, bank: 0 };

        const game = {
            player: [drawCard(), drawCard()],
            dealer: [drawCard(), drawCard()],
            finished: false
        };

        const embed = new EmbedBuilder()
            .setColor("#ED0000")
            .setTitle("blackjack, bitch.")
            .setDescription(
                `Your hand: **${game.player.join(", ")}** (value: ${handValue(game.player)})\n` +
                `Dealer shows: **${game.dealer[0]}**`
            )
            .setFooter({ text: FOOTER_TEXT });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`bj_hit_${user.id}`)
                .setLabel("Hit")
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(`bj_stand_${user.id}`)
                .setLabel("Stand")
                .setStyle(ButtonStyle.Secondary)
        );

        interaction.client.blackjackGames = interaction.client.blackjackGames || {};
        interaction.client.blackjackGames[user.id] = game;

        return interaction.reply({ embeds: [embed], components: [row] });
    }
};
