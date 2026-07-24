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

const ANNOUNCE_CHANNEL = "1513932745854816356";
const EVENTS_ROLE = "1527338030531084498";
const PERMISSION_ROLE = "1530115234767966340";

const DEADCHAT_ROLE = "1530138181490577558";
const DEADCHAT_CHANNEL = "1513932745854816356";
const DEADCHAT_INTERVAL = 5 * 60 * 1000; // 5 minut

let deadchatEnabled = false;

// SLASH COMMAND HANDLER
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  // /announcement
  if (interaction.commandName === "announcement") {
    const member = interaction.member;

    // permission check
    if (!member || !member.roles.cache.has(PERMISSION_ROLE)) {
      const errorEmbed = new EmbedBuilder()
        .setColor("#ED0000")
        .setDescription("❌ nice try bitch, but ur a bit too young for that")
        .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." });

      return interaction.reply({ embeds: [errorEmbed] });
    }

    const title = interaction.options.getString("title");
    const description = interaction.options.getString("description");
    const pingType = interaction.options.getString("ping")?.toLowerCase() || "";

    // ping handling
    let ping = "";
    if (pingType === "everyone") ping = "@everyone";
    if (pingType === "events") ping = `<@&${EVENTS_ROLE}>`;

    const announcerMention = `<@${interaction.user.id}>`;

    // announcement embed
    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor("#ED0000")
      .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
      .addFields(
        {
          name: "announcer",
          value: announcerMention,
          inline: false
        },
        {
          name: "interaction",
          value: `announcer: ${announcerMention}`,
          inline: false
        }
      )
      .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." });

    const channel = interaction.client.channels.cache.get(ANNOUNCE_CHANNEL);

    await channel.send({
      content: ping,
      embeds: [embed]
    });

    const confirmEmbed = new EmbedBuilder()
      .setColor("#00FF00")
      .setDescription("✔ successfully sent bitch")
      .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." });

    // visible to everyone (no ephemeral)
    await interaction.reply({ embeds: [confirmEmbed] });
  }

  // /deadchat
  if (interaction.commandName === "deadchat") {
    const mode = interaction.options.getString("mode")?.toLowerCase();

    if (mode === "on") {
      deadchatEnabled = true;

      const embed = new EmbedBuilder()
        .setColor("#00FF00")
        .setDescription("✔ deadchat mode activated bitch")
        .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." });

      return interaction.reply({ embeds: [embed] });
    }

    if (mode === "off") {
      deadchatEnabled = false;

      const embed = new EmbedBuilder()
        .setColor("#ED0000")
        .setDescription("❌ deadchat mode deactivated bitch")
        .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." });

      return interaction.reply({ embeds: [embed] });
    }

    const errorEmbed = new EmbedBuilder()
      .setColor("#ED0000")
      .setDescription("❌ bitch use mode: on or off")
      .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." });

    return interaction.reply({ embeds: [errorEmbed] });
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
