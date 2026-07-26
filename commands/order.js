const { EmbedBuilder } = require("discord.js");
const fs = require("fs");

const FOOTER_TEXT = ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·.";
const ORDER_CHANNEL = "1530750401995866312";

function loadOrders() {
    if (!fs.existsSync("./data/orders.json")) return { nextId: 1, orders: [] };
    return JSON.parse(fs.readFileSync("./data/orders.json", "utf8"));
}

function saveOrders(data) {
    fs.writeFileSync("./data/orders.json", JSON.stringify(data, null, 2));
}

module.exports = {
    name: "order",
    description: "order food, bitch.",

    async execute(interaction) {
        if (interaction.channel.id !== ORDER_CHANNEL) {
            const embed = new EmbedBuilder()
                .setColor("#ED0000")
                .setDescription("wrong channel, bitch. order in the right place.")
                .setFooter({ text: FOOTER_TEXT });

            return interaction.reply({ embeds: [embed] });
        }

        const food = interaction.options.getString("food");
        const orders = loadOrders();

        const id = orders.nextId++;
        const order = {
            id,
            userId: interaction.user.id,
            food,
            status: "pending",
            cookId: null,
            createdAt: Date.now(),
            deliveredAt: null
        };

        orders.orders.push(order);
        saveOrders(orders);

        const embed = new EmbedBuilder()
            .setColor("#ED0000")
            .setTitle("Order placed, bitch.")
            .setDescription(
                `<@${interaction.user.id}> your order is in.\n\n` +
                `Order #${order.id}\n` +
                `Food: **${order.food}**`
            )
            .setFooter({ text: FOOTER_TEXT });

        return interaction.reply({
            content: `<@${interaction.user.id}>`,
            embeds: [embed]
        });
    }
};
