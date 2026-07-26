require("dotenv").config();

const {
    Client,
    GatewayIntentBits,
    Partials,
    Collection
} = require("discord.js");

const fs = require("fs");

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
        GatewayIntentBits.GuildMembers
    ],
    partials: [Partials.Channel]
});

// ===============================
// COMMAND HANDLING
// ===============================
client.commands = new Collection();

const commandFiles = fs.readdirSync("./commands").filter(f => f.endsWith(".js"));

for (const file of commandFiles) {
    const cmd = require(`./commands/${file}`);
    client.commands.set(cmd.data.name, cmd);
}

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

    // Register slash commands
    await client.application.commands.set(
        commandFiles.map(f => require(`./commands/${f}`).data)
    );

    console.log("Commands registered.");

    // Start systems
    xpSystem.start(client, xpData, saveJson);
    cookSystem.start(client, jobsData, ordersData, saveJson);
    autoOrdersSystem.start(client, ordersData, saveJson);
    salarySystem.start(client, jobsData, economyData, saveJson);
});

// ===============================
// INTERACTION HANDLER
// ===============================
client.on("interactionCreate", async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        await command.execute(interaction, client, {
            xpData,
            economyData,
            jobsData,
            ordersData,
            saveJson
        }, {
            makeEmbed
        });
    } catch (e) {
        console.error(e);
        interaction.reply("error bitch");
    }
});

// ===============================
// LOGIN
// ===============================
client.login(process.env.TOKEN);
