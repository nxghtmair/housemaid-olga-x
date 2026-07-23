// Debug logy – aby Render konečně ukázal chybu
process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT ERROR:", err);
});

process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED PROMISE:", err);
});

console.log("Bot.js se spustil, pokouším se přihlásit...");

const { Client, GatewayIntentBits } = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on("messageCreate", (msg) => {
  if (msg.content === "!ping") {
    msg.reply("pong");
  }
});

client.login(process.env.TOKEN);
