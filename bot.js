// Debug logy – aby Render konečně ukázal chybu
process.on("uncaughtException", async (err) => {
  console.error("UNCAUGHT ERROR:", err);
  await updateStatus("error");
});

process.on("unhandledRejection", async (err) => {
  console.error("UNHANDLED PROMISE:", err);
  await updateStatus("error");
});

console.log("Bot.js se spustil, pokouším se přihlásit...");

let statusConfig = {
  channelId: null,
  messageId: null,
  operational: null,
  error: null,
  shutdown: null,
  image: null
};

async function updateStatus(type) {
  if (!statusConfig.channelId || !statusConfig.messageId) return;

  const channel = await client.channels.fetch(statusConfig.channelId).catch(() => null);
  if (!channel) return;

  const msg = await channel.messages.fetch(statusConfig.messageId).catch(() => null);
  if (!msg) return;

  let text = "";
  if (type === "operational") text = statusConfig.operational;
  if (type === "error") text = statusConfig.error;
  if (type === "shutdown") text = statusConfig.shutdown;

  const { EmbedBuilder } = require("discord.js");

  const embed = new EmbedBuilder()
    .setColor("#ED0000")
    .setTitle("System status")
    .setDescription(text)
    .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." });

  if (statusConfig.image) embed.setImage(statusConfig.image);

  await msg.edit({ embeds: [embed] });
}

const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  PermissionsBitField
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
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.DirectMessages
  ]
});

// IDs & config
const ANNOUNCE_CHANNEL = "1513932745854816356";
const EVENTS_ROLE = "1527338030531084498";
const PERMISSION_ROLE = "1530115234767966340";

const DEADCHAT_ROLE = "1530138181490577558";
const DEADCHAT_CHANNEL = "1513932745854816356";
const DEADCHAT_INTERVAL = 5 * 60 * 1000;

const PIC_CHANNEL = "1530313495906750615";

const BOT_MASTER = "1193517948401373257";

let deadchatEnabled = false;
let botLocked = false;

// pic submit tracking
const picSubmitUsers = new Set();

// READY – presence + slash commands + deadchat interval
client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  try {
    await client.user.setPresence({
      status: "dnd",
      activities: [
        {
          name: "⇢ ˗ˏˋ yet to come bitches ࿐ྂ",
          type: 1
        }
      ]
    });
  } catch (err) {
    console.error("Presence error:", err);
  }

  try {
    await client.application.commands.set([
      // announcement
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

      // deadchat
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
        ),

      // cmd list
      new SlashCommandBuilder()
        .setName("cmd")
        .setDescription("show all commands bitch"),

      // deratization
      new SlashCommandBuilder()
        .setName("deratization")
        .setDescription("lock/unlock channel bitch")
        .addSubcommand(sub =>
          sub.setName("start")
            .setDescription("lock this channel for everyone except admins bitch")
        )
        .addSubcommand(sub =>
          sub.setName("end")
            .setDescription("unlock this channel bitch")
        ),

      // pic submit
      new SlashCommandBuilder()
        .setName("pic")
        .setDescription("pic suggestion bitch")
        .addSubcommand(sub =>
          sub.setName("submit")
            .setDescription("submit a pic bitch")
        ),

      // statuschannel set (GUI via modal + image)
      new SlashCommandBuilder()
        .setName("statuschannel")
        .setDescription("configure status system bitch")
        .addSubcommand(sub =>
          sub.setName("set")
            .setDescription("set status channel bitch")
            .addAttachmentOption(opt =>
              opt.setName("image")
                .setDescription("optional status image bitch")
            )
        ),

      // shutdown command
      new SlashCommandBuilder()
        .setName("shutdown")
        .setDescription("set system to shutdown bitch"),

      // bot lock/unlock
      new SlashCommandBuilder()
        .setName("bot")
        .setDescription("lock/unlock bot bitch")
        .addSubcommand(sub =>
          sub.setName("lock")
            .setDescription("lock bot for everyone except master bitch")
        )
        .addSubcommand(sub =>
          sub.setName("unlock")
            .setDescription("unlock bot bitch")
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
// interaction handler
client.on("interactionCreate", async (interaction) => {
  try {
    // bot lock: ignore everyone except master
    if (botLocked && interaction.user.id !== BOT_MASTER) {
      return;
    }

    // modal submit for status system
    if (interaction.isModalSubmit() && interaction.customId === "status_modal") {
      const channelId = interaction.fields.getTextInputValue("channel");
      const operational = interaction.fields.getTextInputValue("operational");
      const error = interaction.fields.getTextInputValue("error");
      const shutdown = interaction.fields.getTextInputValue("shutdown");

      const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
      if (!channel) {
        return interaction.reply({
          content: "channel not found bitch",
          ephemeral: true
        });
      }

      statusConfig.channelId = channelId;
      statusConfig.operational = operational;
      statusConfig.error = error;
      statusConfig.shutdown = shutdown;

      const embed = new EmbedBuilder()
        .setColor("#ED0000")
        .setTitle("System status")
        .setDescription(operational)
        .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." });

      if (statusConfig.image) embed.setImage(statusConfig.image);

      const msg = await channel.send({ embeds: [embed] });

      statusConfig.messageId = msg.id;

      return interaction.reply({
        content: "status system configured bitch",
        ephemeral: true
      });
    }

    // slash commands
    if (!interaction.isChatInputCommand()) return;

    const guild = interaction.guild;

    // /cmd – list commands (role mentions, readable)
    if (interaction.commandName === "cmd") {
      const embed = new EmbedBuilder()
        .setTitle("Command list – Page 1/1")
        .setColor("#ED0000")
        .setDescription(
          [
            "**/announcement**",
            "• perms: <@&" + PERMISSION_ROLE + ">",
            "• usage: `/announcement title description ping` (everyone / events / none)",
            "",
            "**/deadchat**",
            "• perms: <@&" + PERMISSION_ROLE + ">",
            "• usage: `/deadchat mode` (on / off)",
            "",
            "**/deratization start / end**",
            "• perms: admin",
            "• usage: `/deratization start` (locks this channel), `/deratization end` (unlocks)",
            "",
            "**/pic submit**",
            "• perms: none",
            "• usage: `/pic submit` → bot DM → send pic",
            "",
            "**/statuschannel set**",
            "• perms: admin",
            "• usage: `/statuschannel set` → modal → channel ID + messages + optional image",
            "",
            "**/shutdown**",
            "• perms: admin",
            "• usage: `/shutdown` → sets system to shutdown message",
            "",
            "**/bot lock / unlock**",
            "• perms: only master (`" + BOT_MASTER + "`)",
            "• usage: `/bot lock`, `/bot unlock`"
          ].join("\n")
        )
        .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." });

      return interaction.reply({ embeds: [embed] });
    }

    // /deratization
    if (interaction.commandName === "deratization") {
      const sub = interaction.options.getSubcommand();

      let member;
      try {
        member = await guild.members.fetch(interaction.user.id);
      } catch (err) {
        return interaction.reply({
          content: "cant fetch you bitch",
          ephemeral: true
        });
      }

      if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return interaction.reply({
          content: "nice try bitch, but ur a bit too young for that.",
          ephemeral: true
        });
      }

      const channel = interaction.channel;

      if (sub === "start") {
        await channel.permissionOverwrites.edit(guild.roles.everyone, {
          SendMessages: false
        });

        return interaction.reply({
          content: "🔒 deratization started bitch",
        });
      }

      if (sub === "end") {
        await channel.permissionOverwrites.edit(guild.roles.everyone, {
          SendMessages: true
        });

        return interaction.reply({
          content: "🔓 deratization ended bitch",
        });
      }
    }

    // /pic submit
    if (interaction.commandName === "pic") {
      const sub = interaction.options.getSubcommand();

      if (sub === "submit") {
        picSubmitUsers.add(interaction.user.id);

        const dmEmbed = new EmbedBuilder()
          .setColor("#ED0000")
          .setTitle("Pic submission")
          .setDescription("send me the pic bitch, right here in DM")
          .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." });

        try {
          await interaction.user.send({ embeds: [dmEmbed] });
        } catch (err) {
          return interaction.reply({
            content: "cant DM you bitch, enable DMs",
            ephemeral: true
          });
        }

        return interaction.reply({
          content: "check your DMs bitch",
          ephemeral: true
        });
      }
    }

    // /statuschannel set
    if (interaction.commandName === "statuschannel") {
      const sub = interaction.options.getSubcommand();

      let member;
      try {
        member = await guild.members.fetch(interaction.user.id);
      } catch (err) {
        return interaction.reply({
          content: "cant fetch you bitch",
          ephemeral: true
        });
      }

      if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return interaction.reply({
          content: "nice try bitch, but ur a bit too young for that.",
          ephemeral: true
        });
      }

      if (sub === "set") {
        const image = interaction.options.getAttachment("image");
        statusConfig.image = image ? image.url : null;

        const modal = new ModalBuilder()
          .setCustomId("status_modal")
          .setTitle("Status system setup");

        const channelInput = new TextInputBuilder()
          .setCustomId("channel")
          .setLabel("Channel ID")
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        const operationalInput = new TextInputBuilder()
          .setCustomId("operational")
          .setLabel("Operational message")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true);

        const errorInput = new TextInputBuilder()
          .setCustomId("error")
          .setLabel("Error message")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true);

        const shutdownInput = new TextInputBuilder()
          .setCustomId("shutdown")
          .setLabel("Shutdown message")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true);

        modal.addComponents(
          new ActionRowBuilder().addComponents(channelInput),
          new ActionRowBuilder().addComponents(operationalInput),
          new ActionRowBuilder().addComponents(errorInput),
          new ActionRowBuilder().addComponents(shutdownInput)
        );

        return interaction.showModal(modal);
      }
    }

    // /shutdown
    if (interaction.commandName === "shutdown") {
      let member;
      try {
        member = await guild.members.fetch(interaction.user.id);
      } catch (err) {
        return interaction.reply({
          content: "cant fetch you bitch",
          ephemeral: true
        });
      }

      if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return interaction.reply({
          content: "nice try bitch, but ur a bit too young for that.",
          ephemeral: true
        });
      }

      await updateStatus("shutdown");

      return interaction.reply("⛔ shutdown activated bitch");
    }

    // /bot lock / unlock
    if (interaction.commandName === "bot") {
      const sub = interaction.options.getSubcommand();

      if (sub === "lock") {
        if (interaction.user.id !== BOT_MASTER) {
          return interaction.reply({
            content: "only master can lock me bitch",
            ephemeral: true
          });
        }

        botLocked = true;

        return interaction.reply({
          content: "🔒 bot locked bitch"
        });
      }

      if (sub === "unlock") {
        if (interaction.user.id !== BOT_MASTER) {
          return interaction.reply({
            content: "only master can unlock me bitch",
            ephemeral: true
          });
        }

        botLocked = false;

        return interaction.reply({
          content: "🔓 bot unlocked bitch"
        });
      }
    }

    // /announcement
    if (interaction.commandName === "announcement") {
      let member;
      try {
        member = await guild.members.fetch(interaction.user.id);
      } catch (err) {
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

      const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor("#ED0000")
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." });

      const channel = await interaction.client.channels.fetch(ANNOUNCE_CHANNEL).catch(() => null);

      if (!channel) {
        return interaction.reply({
          content: "announcement channel not found bitch",
          ephemeral: true
        });
      }

      const serverNickname = member.displayName;

      const announcerComponent = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("announcer_display")
          .setLabel(`Announcer: ${serverNickname}`)
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true)
      );

      await channel.send({
        content: ping,
        embeds: [embed],
        components: [announcerComponent]
      });

      const confirmEmbed = new EmbedBuilder()
        .setColor("#00FF00")
        .setDescription("✔ successfully sent bitch")
        .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." });

      await interaction.reply({
        embeds: [confirmEmbed]
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
// DM listener for pic submit
client.on("messageCreate", async (msg) => {
  try {
    // ignore guild messages
    if (msg.guild) return;

    // ignore bot messages
    if (msg.author.bot) return;

    // user must be in picSubmitUsers
    if (!picSubmitUsers.has(msg.author.id)) return;

    // must contain an attachment
    if (!msg.attachments || msg.attachments.size === 0) {
      return msg.reply("bitch send a **picture**, not empty air");
    }

    const attachment = msg.attachments.first();
    if (!attachment.contentType || !attachment.contentType.startsWith("image")) {
      return msg.reply("bitch that is **not** a picture");
    }

    // remove user from waiting list
    picSubmitUsers.delete(msg.author.id);

    // confirm DM
    const confirmEmbed = new EmbedBuilder()
      .setColor("#00FF00")
      .setDescription("✔ picture submitted bitch")
      .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." });

    await msg.reply({ embeds: [confirmEmbed] });

    // post to suggestion channel
    const channel = await client.channels.fetch(PIC_CHANNEL).catch(() => null);
    if (!channel) return;

    const postEmbed = new EmbedBuilder()
      .setColor("#ED0000")
      .setTitle("New pic suggestion")
      .setDescription(`suggested by <@${msg.author.id}>`)
      .setImage(attachment.url)
      .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." })
      .setTimestamp();

    await channel.send({ embeds: [postEmbed] });

  } catch (err) {
    console.error("DM pic submit error:", err);
  }
});

// LOGIN
client.login(process.env.TOKEN)
  .then(() => console.log("Logging in..."))
  .catch(err => {
    console.error("LOGIN FAILED");
    console.error(err);
  });
