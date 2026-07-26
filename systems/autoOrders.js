const { saveJson } = require("../utils/json");

const ORDER_CHANNEL = "1530750401995866312";

let autoEnabled = false;
let intervalRef = null;

function randomFood() {
    const foods = [
        "pizza", "burger", "ramen", "sushi", "tacos",
        "pasta", "salad", "steak", "fries", "sandwich"
    ];
    return foods[Math.floor(Math.random() * foods.length)];
}

function createOrder(ordersData, userId, food) {
    const id = ordersData.nextId++;
    const order = {
        id,
        userId,
        food,
        status: "pending",
        cookId: null,
        createdAt: Date.now(),
        deliveredAt: null
    };
    ordersData.orders.push(order);
    saveJson("./data/orders.json", ordersData);
    return order;
}

module.exports = {
    start(client, ordersData, saveJsonFn) {
        // use provided saveJson if needed
        if (saveJsonFn) {
            // no-op, we already import saveJson above
        }

        function tick() {
            if (!autoEnabled) return;

            const guilds = client.guilds.cache;
            for (const [, guild] of guilds) {
                const orderChannel = guild.channels.cache.get(ORDER_CHANNEL);
                if (!orderChannel) continue;

                const count = Math.floor(Math.random() * 8) + 3; // 3–10
                for (let i = 0; i < count; i++) {
                    const fakeUserId = guild.ownerId; // owner as placeholder
                    const food = randomFood();
                    const order = createOrder(ordersData, fakeUserId, food);

                    // no spam messages, cook panel si to načte
                }
            }
        }

        intervalRef = setInterval(tick, 60 * 1000);
    },

    setEnabled(on) {
        autoEnabled = on;
    },

    isEnabled() {
        return autoEnabled;
    }
};
