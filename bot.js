// Debug logy – aby Render konečně ukázal chybu
process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT ERROR:", err);
});

process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED PROMISE:", err);
});

console.log("Bot.js se spustil, pokouším se přihlásit...");

const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  SlashCommandBuilder
} = require("discord.js");

// TOKEN check
if (!process.env.TOKEN) {
  console.error("TOKEN environment variable is missing.");
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

// IDs & config
const ANNOUNCE_CHANNEL = "1513932745854816356";
const EVENTS_ROLE = "1527338030531084498";
const PERMISSION_ROLE = "1530115234767966340";

const DEADCHAT_ROLE = "1530138181490577558";
const DEADCHAT_CHANNEL = "1513932745854816356";
const DEADCHAT_INTERVAL = 5 * 60 * 1000;

let deadchatEnabled = false;

// READY – presence + slash commands + deadchat interval
client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  try {
    await client.user.setPresence({
      status: "online",
      activities: [
        {
          name: "⇢ ˗ˏˋ Olga family: Season 4 ࿐ྂ",
          type: 0
        }
      ]
    });
  } catch (err) {
    console.error("Presence error:", err);
  }

  try {
    await client.application.commands.set([
      new SlashCommandBuilder()
        .setName("announcement")
        .setDescription("send an announcement bitch")
        .addStringOption(opt =>
          opt.setName("title")
            .setDescription("title bitch")
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName("description")
            .setDescription("description bitch")
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName("ping")
            .setDescription("ping type bitch")
            .addChoices(
              { name: "everyone", value: "everyone" },
              { name: "events", value: "events" },
              { name: "none", value: "none" }
            )
            .setRequired(true)
        ),

      new SlashCommandBuilder()
        .setName("deadchat")
        .setDescription("toggle deadchat bitch")
        .addStringOption(opt =>
          opt.setName("mode")
            .setDescription("on/off bitch")
            .addChoices(
              { name: "on", value: "on" },
              { name: "off", value: "off" }
            )
            .setRequired(true)
        )
    ]).catch(console.error);

    console.log("slash commands registered");
  } catch (err) {
    console.error("Command registration error:", err);
  }

  // DEADCHAT LOOP – spouští se až po ready
  setInterval(async () => {
    if (!deadchatEnabled) return;

    try {
      const channel = await client.channels.fetch(DEADCHAT_CHANNEL).catch(() => null);
      if (!channel) {
        console.error("Deadchat channel not found.");
        return;
      }

      const embed = new EmbedBuilder()
        .setColor("#ED0000")
        .setDescription(`<@&${DEADCHAT_ROLE}> -hears a pin fall- WAKE UP BITCHES`)
        .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." });

      await channel.send({
        content: `<@&${DEADCHAT_ROLE}>`,
        embeds: [embed]
      });
    } catch (err) {
      console.error("Deadchat:", err);
    }
  }, DEADCHAT_INTERVAL);
});
client.on("interactionCreate", async (interaction) => {
  try {
    if (!interaction.isChatInputCommand()) return;

    // /announcement
    if (interaction.commandName === "announcement") {
      const guild = interaction.guild;

      if (!guild) {
        return interaction.reply({
          content: "guild not found bitch",
          ephemeral: true
        });
      }

      let member;
      try {
        member = await guild.members.fetch(interaction.user.id);
      } catch (err) {
        console.error("Member fetch error:", err);
        return interaction.reply({
          content: "cant fetch you bitch",
          ephemeral: true
        });
      }

      if (!member.roles.cache.has(PERMISSION_ROLE)) {
        const errorEmbed = new EmbedBuilder()
          .setColor("#ED0000")
          .setDescription("❌ nice try bitch, but ur a bit too young for that")
          .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." });

        return interaction.reply({
          embeds: [errorEmbed],
          ephemeral: true
        });
      }

      const title = interaction.options.getString("title");
      const description = interaction.options.getString("description");
      const pingType = interaction.options.getString("ping");

      let ping = "";
      if (pingType === "everyone") ping = "@everyone";
      if (pingType === "events") ping = `<@&${EVENTS_ROLE}>`;

      const announcer = `<@${interaction.user.id}>`;

      const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor("#ED0000")
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: "announcer", value: announcer, inline: false },
          { name: "interaction", value: `announcer: ${announcer}`, inline: false }
        )
        .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." });

      const channel = await interaction.client.channels.fetch(ANNOUNCE_CHANNEL).catch(() => null);

      if (!channel) {
        return interaction.reply({
          content: "announcement channel not found bitch",
          ephemeral: true
        });
      }

      await channel.send({
        content: ping,
        embeds: [embed]
      });

      const confirmEmbed = new EmbedBuilder()
        .setColor("#00FF00")
        .setDescription("✔ successfully sent bitch")
        .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." });

      // viditelné pro všechny
      await interaction.reply({
        embeds: [confirmEmbed]
      });
    }

    // /deadchat
    if (interaction.commandName === "deadchat") {
      const guild = interaction.guild;

      if (!guild) {
        return interaction.reply({
          content: "guild not found bitch",
          ephemeral: true
        });
      }

      let member;
      try {
        member = await guild.members.fetch(interaction.user.id);
      } catch (err) {
        console.error("Member fetch error:", err);
        return interaction.reply({
          content: "cant fetch you bitch",
          ephemeral: true
        });
      }

      // stejná permission role jako u announcement
      if (!member.roles.cache.has(PERMISSION_ROLE)) {
        const errorEmbed = new EmbedBuilder()
          .setColor("#ED0000")
          .setDescription("❌ nice try bitch, but ur a bit too young for that")
          .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." });

        return interaction.reply({
          embeds: [errorEmbed],
          ephemeral: true
        });
      }

      const mode = interaction.options.getString("mode");

      if (mode === "on") {
        deadchatEnabled = true;

        const embed = new EmbedBuilder()
          .setColor("#00FF00")
          .setDescription("✔ deadchat mode activated bitch")
          .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." });

        return interaction.reply({
          embeds: [embed]
        });
      }

      if (mode === "off") {
        deadchatEnabled = false;

        const embed = new EmbedBuilder()
          .setColor("#ED0000")
          .setDescription("❌ deadchat mode deactivated bitch")
          .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." });

        return interaction.reply({
          embeds: [embed]
        });
      }

      const errorEmbed = new EmbedBuilder()
        .setColor("#ED0000")
        .setDescription("❌ bitch use mode: on or off")
        .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." });

      return interaction.reply({
        embeds: [errorEmbed],
        ephemeral: true
      });
    }
  } catch (err) {
    console.error("interaction error:", err);

    if (interaction.replied || interaction.deferred) {
      return interaction.followUp({
        content: "something went wrong bitch",
        ephemeral: true
      });
    } else {
      return interaction.reply({
        content: "something went wrong bitch",
        ephemeral: true
      });
    }
  }
});
client.login(process.env.TOKEN)
  .then(() => console.log("Logging in..."))
  .catch(err => {
    console.error("LOGIN FAILED");
    console.error(err);
  });
