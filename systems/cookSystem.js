const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    EmbedBuilder
} = require("discord.js");

const { makeEmbed } = require("../utils/embeds");

const COOK_ROLE = "1530751512752558131";
const ORDER_CHANNEL = "1530750401995866312";

module.exports = {
    start(client, jobsData, ordersData, saveJson) {

        // Active cook panels (messageId → userId)
        const activePanels = new Map();

        // Create cook panel message
        async function createCookPanel(interaction) {
            const userId = interaction.user.id;

            const embed = makeEmbed(
                "cook panel bitch\n\n" +
                "choose what you wanna do"
            , "Cook Panel");

            const menu = new StringSelectMenuBuilder()
                .setCustomId(`cook_main_${userId}`)
                .setPlaceholder("choose bitch")
                .addOptions([
                    {
                        label: "Orders",
                        value: "orders",
                        description: "see pending orders bitch"
                    },
                    {
                        label: "Orders Log",
                        value: "log",
                        description: "see completed orders bitch"
                    }
                ]);

            const row = new ActionRowBuilder().addComponents(menu);

            const msg = await interaction.reply({
                embeds: [embed],
                components: [row],
                fetchReply: true
            });

            activePanels.set(msg.id, userId);
        }

        // Update panel message
        async function updatePanel(interaction, embed, components) {
            const msg = await interaction.update({
                embeds: [embed],
                components
            });

            return msg;
        }

        // Build orders list embed
        function buildOrdersEmbed() {
            const pending = ordersData.orders.filter(o => o.status === "pending");

            let desc = "";
            if (pending.length === 0) {
                desc = "no orders bitch";
            } else {
                desc = pending
                    .map(o => `#${o.id} – <@${o.userId}> – **${o.food}**`)
                    .join("\n");
            }

            return makeEmbed(desc, "Pending Orders");
        }

        // Build log embed
        function buildLogEmbed(userId) {
            const completed = ordersData.orders.filter(
                o => o.cookId === userId && o.status === "completed"
            );

            let desc = "";
            if (completed.length === 0) {
                desc = "no completed orders bitch";
            } else {
                desc = completed
                    .map(o =>
                        `#${o.id} – <@${o.userId}> – **${o.food}** – delivered: ${new Date(o.deliveredAt).toLocaleString()}`
                    )
                    .join("\n");
            }

            return makeEmbed(desc, "Orders Log");
        }

        // Handle interactions
        client.on("interactionCreate", async interaction => {
            if (!interaction.isStringSelectMenu() && !interaction.isButton() && !interaction.isModalSubmit()) return;

            const id = interaction.customId;

            // MAIN PANEL SELECT
            if (id.startsWith("cook_main_")) {
                const executorId = id.split("_")[2];
                if (interaction.user.id !== executorId) {
                    return interaction.reply({
                        embeds: [makeEmbed("this ain't your panel bitch")],
                        ephemeral: true
                    });
                }

                const choice = interaction.values[0];

                if (choice === "orders") {
                    const embed = buildOrdersEmbed();

                    const pending = ordersData.orders.filter(o => o.status === "pending");

                    const options = pending.map(o => ({
                        label: `Order #${o.id}`,
                        value: String(o.id),
                        description: o.food
                    }));

                    const select = new StringSelectMenuBuilder()
                        .setCustomId(`cook_claim_${executorId}`)
                        .setPlaceholder("claim order bitch")
                        .addOptions(options);

                    const deleteBtn = new ButtonBuilder()
                        .setCustomId(`cook_delete_${executorId}`)
                        .setLabel("delete order bitch")
                        .setStyle(ButtonStyle.Danger);

                    const backBtn = new ButtonBuilder()
                        .setCustomId(`cook_back_${executorId}`)
                        .setLabel("back bitch")
                        .setStyle(ButtonStyle.Secondary);

                    const rows = [
                        new ActionRowBuilder().addComponents(select),
                        new ActionRowBuilder().addComponents(deleteBtn, backBtn)
                    ];

                    return updatePanel(interaction, embed, rows);
                }

                if (choice === "log") {
                    const embed = buildLogEmbed(executorId);

                    const backBtn = new ButtonBuilder()
                        .setCustomId(`cook_back_${executorId}`)
                        .setLabel("back bitch")
                        .setStyle(ButtonStyle.Secondary);

                    const row = new ActionRowBuilder().addComponents(backBtn);

                    return updatePanel(interaction, embed, [row]);
                }
            }

            // BACK BUTTON
            if (id.startsWith("cook_back_")) {
                const executorId = id.split("_")[2];
                if (interaction.user.id !== executorId) {
                    return interaction.reply({
                        embeds: [makeEmbed("this ain't your panel bitch")],
                        ephemeral: true
                    });
                }

                const embed = makeEmbed(
                    "cook panel bitch\n\nchoose what you wanna do",
                    "Cook Panel"
                );

                const menu = new StringSelectMenuBuilder()
                    .setCustomId(`cook_main_${executorId}`)
                    .setPlaceholder("choose bitch")
                    .addOptions([
                        { label: "Orders", value: "orders" },
                        { label: "Orders Log", value: "log" }
                    ]);

                const row = new ActionRowBuilder().addComponents(menu);

                return updatePanel(interaction, embed, [row]);
            }

            // CLAIM ORDER
            if (id.startsWith("cook_claim_")) {
                const executorId = id.split("_")[2];
                if (interaction.user.id !== executorId) {
                    return interaction.reply({
                        embeds: [makeEmbed("this ain't your panel bitch")],
                        ephemeral: true
                    });
                }

                const orderId = parseInt(interaction.values[0]);
                const order = ordersData.orders.find(o => o.id === orderId && o.status === "pending");

                if (!order) {
                    return interaction.reply({
                        embeds: [makeEmbed("order gone bitch")],
                        ephemeral: true
                    });
                }

                order.status = "completed";
                order.cookId = executorId;
                order.deliveredAt = Date.now();

                saveJson("./data/orders.json", ordersData);

                const embed = makeEmbed(
                    `order #${order.id} delivered bitch\n\nfood: **${order.food}**`,
                    "Delivered"
                );

                const backBtn = new ButtonBuilder()
                    .setCustomId(`cook_back_${executorId}`)
                    .setLabel("back bitch")
                    .setStyle(ButtonStyle.Secondary);

                const row = new ActionRowBuilder().addComponents(backBtn);

                return updatePanel(interaction, embed, [row]);
            }

            // DELETE ORDER
            if (id.startsWith("cook_delete_")) {
                const executorId = id.split("_")[2];
                if (interaction.user.id !== executorId) {
                    return interaction.reply({
                        embeds: [makeEmbed("this ain't your panel bitch")],
                        ephemeral: true
                    });
                }

                const pending = ordersData.orders.filter(o => o.status === "pending");

                if (pending.length === 0) {
                    return interaction.reply({
                        embeds: [makeEmbed("no orders to delete bitch")],
                        ephemeral: true
                    });
                }

                const order = pending[0];
                order.status = "deleted";

                saveJson("./data/orders.json", ordersData);

                const embed = makeEmbed(
                    `deleted order #${order.id} bitch`,
                    "Deleted"
                );

                const backBtn = new ButtonBuilder()
                    .setCustomId(`cook_back_${executorId}`)
                    .setLabel("back bitch")
                    .setStyle(ButtonStyle.Secondary);

                const row = new ActionRowBuilder().addComponents(backBtn);

                return updatePanel(interaction, embed, [row]);
            }
        });

        // Slash command handler (from commands folder)
        client.on("interactionCreate", async interaction => {
            if (!interaction.isChatInputCommand()) return;
            if (interaction.commandName !== "jobpanel") return;

            const userId = interaction.user.id;
            const jobInfo = jobsData.users[userId];

            if (!jobInfo || jobInfo.job !== "cook") {
                return interaction.reply({
                    embeds: [makeEmbed("you ain't a cook bitch")],
                    ephemeral: true
                });
            }

            return createCookPanel(interaction);
        });
    }
};
