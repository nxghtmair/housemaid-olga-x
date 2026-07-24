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

  client.user.setPresence({
    status: "dnd", // červené kolečko
    activities: [
      {
        name: "⇢ ˗ˏˋ Olga family: Season 4 ࿐ྂ",
        type: 0 // Playing
      }
    ]
  });
});



client.on("messageCreate", (msg) => {
  if (msg.content === "!ping") {
    msg.reply("pong");
  }
});
const { EmbedBuilder } = require("discord.js");

const PREFIX = "h!";
const ANNOUNCE_CHANNEL = "1513932745854816356";
const EVENTS_ROLE = "1527338030531084498";
const PERMISSION_ROLE = "1530115234767966340";

client.on("messageCreate", async (msg) => {
  if (!msg.content.startsWith(PREFIX)) return;

  const raw = msg.content.slice(PREFIX.length).trim();
  const command = raw.split(" ")[0].toLowerCase();

  // ANNOUNCEMENT COMMAND
  if (command === "announcement") {

    // remove the command name from the raw text
    const argsText = raw.slice("announcement".length).trim();

    // split by commas
    const parts = argsText.split(",").map(p => p.trim());

    // PERMISSION CHECK
    if (!msg.member.roles.cache.has(PERMISSION_ROLE)) {
      const errorEmbed = new EmbedBuilder()
        .setColor("#ED0000")
        .setDescription("❌ nice try bitch, but ur a bit too young for that");

      return msg.channel.send({ embeds: [errorEmbed] });
    }

    // ARGUMENT CHECK
    if (parts.length < 3) {
      const errorEmbed = new EmbedBuilder()
        .setColor("#ED0000")
        .setDescription("❌ bitch u forgot something, use: h!announcement title, description, ping");

      return msg.channel.send({ embeds: [errorEmbed] });
    }

    const title = parts[0];
    const description = parts[1];
    const pingType = parts[2].toLowerCase();

    // PING HANDLING
    let ping = "";
    if (pingType === "everyone") ping = "@everyone";
    if (pingType === "events") ping = `<@&${EVENTS_ROLE}>`;

    // CREATE ANNOUNCEMENT EMBED
    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor("#ED0000")
      .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." });

    // SEND TO ANNOUNCEMENT CHANNEL
    const channel = msg.client.channels.cache.get(ANNOUNCE_CHANNEL);

    await channel.send({
      content: ping,
      embeds: [embed]
    });

    // CONFIRM EMBED
    const confirmEmbed = new EmbedBuilder()
      .setColor("#00FF00")
      .setDescription("✔ successfully sent bitch");

    await msg.channel.send({ embeds: [confirmEmbed] });
  }
});

const { EmbedBuilder } = require("discord.js");

const PREFIX = "h!";
const ANNOUNCE_CHANNEL = "1513932745854816356";
const EVENTS_ROLE = "1527338030531084498";
const PERMISSION_ROLE = "1530115234767966340";

client.on("messageCreate", async (msg) => {
  if (!msg.content.startsWith(PREFIX)) return;

  const raw = msg.content.slice(PREFIX.length).trim();
  const command = raw.split(" ")[0].toLowerCase();

  // ANNOUNCEMENT COMMAND
  if (command === "announcement") {

    // remove the command name from the raw text
    const argsText = raw.slice("announcement".length).trim();

    // split by commas
    const parts = argsText.split(",").map(p => p.trim());

    // PERMISSION CHECK
    if (!msg.member.roles.cache.has(PERMISSION_ROLE)) {
      const errorEmbed = new EmbedBuilder()
        .setColor("#ED0000")
        .setDescription("❌ nice try bitch, but ur a bit too young for that");

      return msg.channel.send({ embeds: [errorEmbed] });
    }

    // ARGUMENT CHECK
    if (parts.length < 3) {
      const errorEmbed = new EmbedBuilder()
        .setColor("#ED0000")
        .setDescription("❌ bitch u forgot something, use: h!announcement title, description, ping");

      return msg.channel.send({ embeds: [errorEmbed] });
    }

    const title = parts[0];
    const description = parts[1];
    const pingType = parts[2].toLowerCase();

    // PING HANDLING
    let ping = "";
    if (pingType === "everyone") ping = "@everyone";
    if (pingType === "events") ping = `<@&${EVENTS_ROLE}>`;

    // CREATE ANNOUNCEMENT EMBED
    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor("#ED0000")
      .setThumbnail(msg.author.displayAvatarURL({ dynamic: true }))
      .addFields({
        name: "executed by",
        value: `<@${msg.author.id}>`,
        inline: false
      })
      .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." });

    // SEND TO ANNOUNCEMENT CHANNEL
    const channel = msg.client.channels.cache.get(ANNOUNCE_CHANNEL);

    await channel.send({
      content: ping,
      embeds: [embed]
    });

    // CONFIRM EMBED
    const confirmEmbed = new EmbedBuilder()
      .setColor("#00FF00")
      .setDescription("✔ successfully sent bitch");

    await msg.channel.send({ embeds: [confirmEmbed] });
  }
});



const { EmbedBuilder } = require("discord.js");

let deadchatEnabled = false; // toggle state
const DEADCHAT_ROLE = "1530138181490577558"; // role to ping
const DEADCHAT_CHANNEL = "1513932745854816356"; // same channel as announcements
const DEADCHAT_INTERVAL = 5 * 60 * 1000; // 5 minutes

// DEADCHAT COMMAND
client.on("messageCreate", async (msg) => {
  if (!msg.content.startsWith("h!deadchat")) return;

  // toggle
  if (deadchatEnabled === false) {
    deadchatEnabled = true;

    const embed = new EmbedBuilder()
      .setColor("#00FF00")
      .setDescription("✔ deadchat mode activated bitch")
      .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." });

    await msg.channel.send({ embeds: [embed] });
  } else {
    deadchatEnabled = false;

    const embed = new EmbedBuilder()
      .setColor("#ED0000")
      .setDescription("❌ deadchat mode deactivated bitch")
      .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." });

    await msg.channel.send({ embeds: [embed] });
  }
});

// DEADCHAT LOOP
setInterval(async () => {
  if (!deadchatEnabled) return;

  const channel = client.channels.cache.get(DEADCHAT_CHANNEL);
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setColor("#ED0000")
    .setDescription(`<@&${DEADCHAT_ROLE}> -hears a pin fall- WAKE UP BITCHES`)
    .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." });

  await channel.send({
    content: `<@&${DEADCHAT_ROLE}>`,
    embeds: [embed]
  });

}, DEADCHAT_INTERVAL);





client.login(process.env.TOKEN);
