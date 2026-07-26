require("dotenv").config();

const {
    Client,
    GatewayIntentBits,
    Partials,
    EmbedBuilder
} = require("discord.js");

const fs = require("fs");
const path = require("path");

// ===============================
// LOAD UTILS
// ===============================
const { loadJson, saveJson } = require("./utils/json");
const { makeEmbed } = require("./utils/embeds");

// ===============================
// LOAD DATA
// ===============================
const xpData = loadJson("./data/xpData.json", { users: {} });
const economyData = loadJson("./data/economy.json", { users: {} });
const jobsData = loadJson("./data/jobs.json", { users: {} });
const ordersData = loadJson("./data/orders.json", { nextId: 1, orders: [] });

// ===============================
// CLIENT
// ===============================
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.DirectMessages
    ],
    partials: [Partials.Channel]
});

// ===============================
// COMMAND LOADER
// ===============================
client.commands = new Map();

const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith(".js"));

for (const file of commandFiles) {
    const cmd = require(`./commands/${file}`);
    client.commands.set(cmd.name, cmd);
}

console.log(`Loaded ${client.commands.size} commands.`);

// ===============================
// SYSTEMS
// ===============================
const xpSystem = require("./systems/xpSystem");
const cookSystem = require("./systems/cookSystem");
const autoOrdersSystem = require("./systems/autoOrders");
const salarySystem = require("./systems/salary");

client.autoOrdersSystem = autoOrdersSystem;

// ===============================
// READY
// ===============================
client.once("ready", async () => {
    console.log(`Logged in as ${client.user.tag}`);

    // Set bot status + activity
    client.user.setPresence({
        status: "dnd",
        activities: [
            {
                name: " ≡;- ꒰ °Olgasm: V0.9 ꒱ ",
                type: 3 // Watching
            }
        ]
    });

    // Start systems
    xpSystem.start(client);
    cookSystem.start(client, jobsData, ordersData, saveJson);
    autoOrdersSystem.start(client, ordersData, saveJson);
    salarySystem.start(client, jobsData, economyData, saveJson);

    console.log("Systems started.");
});

// ===============================
// INTERACTION HANDLER
// ===============================
client.on("interactionCreate", async (interaction) => {

    // Slash commands
    if (interaction.isChatInputCommand()) {

        // Bot lock check
        if (client.botLocked && interaction.user.id !== "1193517948401373257") {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#ED0000")
                        .setDescription("bot is locked, bitch.")
                        .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." })
                ]
            });
        }

        const cmd = client.commands.get(interaction.commandName);
        if (!cmd) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#ED0000")
                        .setDescription("this command is dead, bitch.")
                        .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." })
                ]
            });
        }

        try {
            await cmd.execute(interaction);
        } catch (err) {
            console.error(err);

            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#ED0000")
                        .setDescription("error executing command, bitch.")
                        .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." })
                ]
            });
        }
    }

    // Buttons
    if (interaction.isButton()) {
        const id = interaction.customId;

        // FAMILY SYSTEM BUTTONS
        if (id.startsWith("family_")) {
            const parts = id.split("_");
            const type = parts[1];
            const decision = parts[2];
            const a = parts[3];
            const b = parts[4];

            const family = loadJson("./data/family.json", { marriages: [], parents: [] });

            if (decision === "no") {
                return interaction.update({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("#ED0000")
                            .setDescription("they said no, bitch.")
                            .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." })
                    ],
                    components: []
                });
            }

            if (type === "marry") {
                family.marriages.push({ a, b });
            }

            if (type === "adopt") {
                family.parents.push({ parent: a, child: b });
            }

            saveJson("./data/family.json", family);

            return interaction.update({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#ED0000")
                        .setDescription("confirmed, bitch.")
                        .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." })
                ],
                components: []
            });
        }

        // BLACKJACK BUTTONS
        if (id.startsWith("bj_")) {
            const parts = id.split("_");
            const action = parts[1];
            const uid = parts[2];

            if (interaction.user.id !== uid) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("#ED0000")
                            .setDescription("this ain't your game, bitch.")
                            .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." })
                    ]
                });
            }

            const game = client.blackjackGames?.[uid];
            if (!game || game.finished) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("#ED0000")
                            .setDescription("game is over, bitch.")
                            .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." })
                    ]
                });
            }

            // Blackjack logic continues in blackjack.js
        }
    }

    // Select menus
    if (interaction.isStringSelectMenu()) {
        const id = interaction.customId;

        // JOBLIST SELECT
        if (id.startsWith("joblist_select_")) {
            const userId = id.split("_")[2];

            if (interaction.user.id !== userId) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("#ED0000")
                            .setDescription("this ain't your joblist, bitch.")
                            .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." })
                    ]
                });
            }

            const jobs = loadJson("./data/jobs.json", { users: {} });
            const job = interaction.values[0];

            jobs.users[userId].job = job;
            jobs.users[userId].lastActivity = Date.now();

            saveJson("./data/jobs.json", jobs);

            return interaction.update({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#ED0000")
                        .setDescription(`you are now a **${job}**, bitch.`)
                        .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." })
                ],
                components: []
            });
        }
    }

    // Modal submits
    if (interaction.isModalSubmit()) {
        const id = interaction.customId;

        // EMBED CREATE
        if (id === "embed_modal") {
            const title = interaction.fields.getTextInputValue("embed_title");
            const desc = interaction.fields.getTextInputValue("embed_desc");
            const image = interaction.fields.getTextInputValue("embed_image");
            const footer = interaction.fields.getTextInputValue("embed_footer");

            const embed = new EmbedBuilder()
                .setColor("#ED0000")
                .setDescription(desc)
                .setFooter({ text: footer || ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." });

            if (title) embed.setTitle(title);
            if (image) embed.setImage(image);

            await interaction.channel.send({ embeds: [embed] });

            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#ED0000")
                        .setDescription("embed sent, bitch.")
                        .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." })
                ]
            });
        }

        // EMBED EDIT
        if (id.startsWith("embed_edit_")) {
            const msgId = id.split("_")[2];

            const newTitle = interaction.fields.getTextInputValue("embed_title");
            const newDesc = interaction.fields.getTextInputValue("embed_desc");
            const newImage = interaction.fields.getTextInputValue("embed_image");
            const newFooter = interaction.fields.getTextInputValue("embed_footer");

            const msg = await interaction.channel.messages.fetch(msgId).catch(() => null);
            if (!msg || !msg.embeds.length) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("#ED0000")
                            .setDescription("message is dead, bitch.")
                            .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." })
                    ]
                });
            }

            const old = msg.embeds[0];
            const embed = new EmbedBuilder()
                .setColor(old.color || "#ED0000")
                .setTitle(newTitle || old.title)
                .setDescription(newDesc || old.description)
                .setFooter({ text: newFooter || old.footer?.text || ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." });

            if (newImage) embed.setImage(newImage);
            else if (old.image) embed.setImage(old.image.url);

            await msg.edit({ embeds: [embed] });

            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#ED0000")
                        .setDescription("embed edited, bitch.")
                        .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." })
                ]
            });
        }
    }
});

// ===============================
// LOGIN
// ===============================
client.login(process.env.TOKEN);
