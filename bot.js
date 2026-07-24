// ===============================
// ERROR LOGGING + STATUS UPDATE
// ===============================
process.on("uncaughtException", async (err) => {
  console.error("UNCAUGHT ERROR:", err);
  await updateStatus("error");
});

process.on("unhandledRejection", async (err) => {
  console.error("UNHANDLED PROMISE:", err);
  await updateStatus("error");
});

console.log("Bot.js se spustil, pokouším se přihlásit...");

// ===============================
// STATUS SYSTEM CONFIG
// ===============================
let statusConfig = {
  channelId: null,
  messageId: null,
  operational: null,
  error: null,
  shutdown: null,
  image: null
};

// ===============================
// DAILY STREAK (LOAD FROM FILE)
// ===============================
const fs = require("fs");

let dailyStreak = 0;

// load streak if exists
try {
  if (fs.existsSync("streak.json")) {
    const data = JSON.parse(fs.readFileSync("streak.json", "utf8"));
    dailyStreak = data.dailyStreak || 0;
  }
} catch (err) {
  console.error("Failed to load streak:", err);
}

// save streak
function saveStreak() {
  fs.writeFileSync("streak.json", JSON.stringify({ dailyStreak }));
}

// ===============================
// STATUS SYSTEM EDIT FUNCTION
// ===============================
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
  if (type === "locked") text = "🔒 bot is locked bitch";
  if (type === "unlocked") text = statusConfig.operational;

  const embed = new EmbedBuilder()
    .setColor("#ED0000")
    .setTitle("System status")
    .setDescription(text)
    .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." });

  if (statusConfig.image) embed.setImage(statusConfig.image);

  await msg.edit({ embeds: [embed] });
}

// ===============================
// DISCORD IMPORTS
// ===============================
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

// ===============================
// TOKEN CHECK
// ===============================
if (!process.env.TOKEN) {
  console.error("TOKEN environment variable is missing.");
  process.exit(1);
}

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
  ]
});

// ===============================
// IDs & CONFIG
// ===============================
const ANNOUNCE_CHANNEL = "1513932745854816356";
const EVENTS_ROLE = "1527338030531084498";
const PERMISSION_ROLE = "1530115234767966340";

const DEADCHAT_ROLE = "1530138181490577558";
const DEADCHAT_CHANNEL = "1513932745854816356";
const DEADCHAT_INTERVAL = 5 * 60 * 1000;

const PIC_CHANNEL = "1530313495906750615";

const DAILY_CHANNEL = "1517175386021040138";
const DAILY_ROLE = "1530312898939977841";

const BOT_MASTER = "1193517948401373257";

let deadchatEnabled = false;
let botLocked = false;

// ===============================
// PIC SUBMIT TRACKING
// ===============================
const picSubmitUsers = new Set();

// ===============================
// READY EVENT
// ===============================
client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  await updateStatus("operational");

  try {
    await client.user.setPresence({
      status: "idle",
      activities: [
        {
          name: "⇢ ˗ˏˋ Olgasm; V0.5 ࿐ྂ",
          type: 1
        }
      ]
    });
  } catch (err) {
    console.error("Presence error:", err);
  }

  // ===============================
  // REGISTER SLASH COMMANDS
  // ===============================
  try {
    await client.application.commands.set([
      new SlashCommandBuilder()
        .setName("announcement")
        .setDescription("send an announcement bitch")
        .addStringOption(opt =>
          opt.setName("title").setDescription("title bitch").setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName("description").setDescription("description bitch").setRequired(true)
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
        ),

      new SlashCommandBuilder()
        .setName("cmd")
        .setDescription("show all commands bitch"),

      new SlashCommandBuilder()
        .setName("deratization")
        .setDescription("lock/unlock channel bitch")
        .addSubcommand(sub => sub.setName("start").setDescription("lock channel"))
        .addSubcommand(sub => sub.setName("end").setDescription("unlock channel")),

      new SlashCommandBuilder()
        .setName("pic")
        .setDescription("pic suggestion bitch")
        .addSubcommand(sub => sub.setName("submit").setDescription("submit a pic bitch")),

      new SlashCommandBuilder()
        .setName("statuschannel")
        .setDescription("configure status system bitch")
        .addSubcommand(sub =>
          sub.setName("set")
            .setDescription("set status channel bitch")
            .addAttachmentOption(opt =>
              opt.setName("image").setDescription("optional status image bitch")
            )
        ),

      new SlashCommandBuilder()
        .setName("shutdown")
        .setDescription("set system to shutdown bitch"),

      new SlashCommandBuilder()
        .setName("bot")
        .setDescription("lock/unlock bot bitch")
        .addSubcommand(sub => sub.setName("lock").setDescription("lock bot"))
        .addSubcommand(sub => sub.setName("unlock").setDescription("unlock bot")),

      // EMBED CREATOR
      new SlashCommandBuilder()
        .setName("embed")
        .setDescription("create a custom embed bitch")
        .addSubcommand(sub =>
          sub.setName("create").setDescription("create a custom embed bitch")
        ),

      // REACTION ROLES
      new SlashCommandBuilder()
        .setName("rolescreate")
        .setDescription("create reaction roles bitch")
    ]);

    console.log("slash commands registered");
  } catch (err) {
    console.error("Command registration error:", err);
  }

  // ===============================
  // DEADCHAT LOOP
  // ===============================
  setInterval(async () => {
    if (!deadchatEnabled) return;

    try {
      const channel = await client.channels.fetch(DEADCHAT_CHANNEL).catch(() => null);
      if (!channel) return;

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

  // ===============================
  // DAILY WORDLE REMINDER (6:15 PM EST)
  // ===============================
  setInterval(async () => {
    const now = new Date();
    const estTime = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
    const hours = estTime.getHours();
    const minutes = estTime.getMinutes();

    if (hours === 18 && minutes === 15) {
      dailyStreak++;
      saveStreak();

      const channel = await client.channels.fetch(DAILY_CHANNEL).catch(() => null);
      if (!channel) return;

      const embed = new EmbedBuilder()
        .setColor("#ED0000")
        .setDescription(
          "-burps- -grabs pen- YO YO YO, another day another wordle & connections mashup 😆! keep up the great guessing, keep your minds turned on, and the best person at the end of each month might eventually receive an award (such as nitro, etc.) (no cheating only)\n\n" +
          `**🔥 Current Streak : ${dailyStreak}**`
        )
        .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." });

      await channel.send({
        content: `<@&${DAILY_ROLE}>`,
        embeds: [embed]
      });
    }

  }, 60 * 1000);
});
// interaction handler
client.on("interactionCreate", async (interaction) => {
  try {
    // bot lock: ignore everyone except master
    if (botLocked && interaction.user.id !== BOT_MASTER) {
      await updateStatus("locked");
      return;
    }

    // ===========================
    // MODAL SUBMIT – STATUS SYSTEM
    // ===========================
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

      // uložíme konfiguraci
      statusConfig.channelId = channelId;
      statusConfig.operational = operational;
      statusConfig.error = error;
      statusConfig.shutdown = shutdown;

      // vytvoříme embed
      const embed = new EmbedBuilder()
        .setColor("#ED0000")
        .setTitle("System status")
        .setDescription(operational)
        .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." });

      if (statusConfig.image) embed.setImage(statusConfig.image);

      const msg = await channel.send({ embeds: [embed] });

      // uložíme messageId
      statusConfig.messageId = msg.id;

      return interaction.reply({
        content: "status system configured bitch",
        ephemeral: true
      });
    }

    // ===========================
    // CUSTOM EMBED CREATOR MODAL SUBMIT
    // ===========================
    if (interaction.isModalSubmit() && interaction.customId === "embed_modal") {

      const title = interaction.fields.getTextInputValue("embed_title");
      const desc = interaction.fields.getTextInputValue("embed_desc");
      const color = interaction.fields.getTextInputValue("embed_color");
      const image = interaction.fields.getTextInputValue("embed_image");
      const thumb = interaction.fields.getTextInputValue("embed_thumb");
      const footer = interaction.fields.getTextInputValue("embed_footer");

      const embed = new EmbedBuilder().setDescription(desc);

      if (title) embed.setTitle(title);
      if (color) embed.setColor(color);
      else embed.setColor("#ED0000");
      if (image) embed.setImage(image);
      if (thumb) embed.setThumbnail(thumb);
      if (footer) embed.setFooter({ text: footer });

      await interaction.channel.send({ embeds: [embed] });

      return interaction.reply({
        content: "✔ embed sent bitch",
        ephemeral: true
      });
    }

    // ===========================
    // REACTION ROLES MODAL SUBMIT
    // ===========================
    if (interaction.isModalSubmit() && interaction.customId === "roles_modal") {

      const msgId = interaction.fields.getTextInputValue("roles_msgid");
      const emoji = interaction.fields.getTextInputValue("roles_emoji");
      const roleId = interaction.fields.getTextInputValue("roles_role");

      const channel = interaction.channel;

      let targetMsg;
      try {
        targetMsg = await channel.messages.fetch(msgId);
      } catch (err) {
        return interaction.reply({
          content: "cant find that message bitch",
          ephemeral: true
        });
      }

      const btn = new ButtonBuilder()
        .setCustomId(`rr_${roleId}`)
        .setEmoji(emoji)
        .setStyle(ButtonStyle.Secondary);

      const row = new ActionRowBuilder().addComponents(btn);

      await targetMsg.edit({
        components: [row]
      });

      return interaction.reply({
        content: "✔ reaction role added bitch",
        ephemeral: true
      });
    }

    // ===========================
    // BUTTON HANDLER FOR REACTION ROLES
    // ===========================
    if (interaction.isButton() && interaction.customId.startsWith("rr_")) {

      const roleId = interaction.customId.replace("rr_", "");
      const role = interaction.guild.roles.cache.get(roleId);

      if (!role) {
        return interaction.reply({
          content: "role not found bitch",
          ephemeral: true
        });
      }

      const member = interaction.guild.members.cache.get(interaction.user.id);

      if (!member) {
        return interaction.reply({
          content: "cant fetch you bitch",
          ephemeral: true
        });
      }

      if (member.roles.cache.has(roleId)) {
        await member.roles.remove(roleId);
        return interaction.reply({
          content: `✔ successfully removed <@&${roleId}>`,
          ephemeral: true
        });
      } else {
        await member.roles.add(roleId);
        return interaction.reply({
          content: `✔ successfully added <@&${roleId}>`,
          ephemeral: true
        });
      }
    }

    // ===========================
    // SLASH COMMANDS
    // ===========================
    if (!interaction.isChatInputCommand()) return;

    const guild = interaction.guild;

    // ===========================
    // /cmd – command list
    // ===========================
    if (interaction.commandName === "cmd") {
      const embed = new EmbedBuilder()
        .setTitle("Command list – Page 1/1")
        .setColor("#ED0000")
        .setDescription(
          [
            "**/announcement**",
            "• perms: <@&" + PERMISSION_ROLE + ">",
            "",
            "**/deadchat**",
            "• perms: <@&" + PERMISSION_ROLE + ">",
            "",
            "**/deratization start / end**",
            "• perms: admin",
            "",
            "**/pic submit**",
            "• perms: none",
            "",
            "**/statuschannel set**",
            "• perms: admin",
            "",
            "**/shutdown**",
            "• perms: admin",
            "",
            "**/bot lock / unlock**",
            "• perms: only master",
            "",
            "**/embed create**",
            "• perms: admin",
            "",
            "**/rolescreate**",
            "• perms: admin"
          ].join("\n")
        )
        .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." });

      return interaction.reply({ embeds: [embed] });
    }

    // ===========================
    // /rolescreate
    // ===========================
    if (interaction.commandName === "rolescreate") {

      const modal = new ModalBuilder()
        .setCustomId("roles_modal")
        .setTitle("Reaction Roles Setup");

      const msgIdInput = new TextInputBuilder()
        .setCustomId("roles_msgid")
        .setLabel("Message ID")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const emojiInput = new TextInputBuilder()
        .setCustomId("roles_emoji")
        .setLabel("Emoji")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const roleInput = new TextInputBuilder()
        .setCustomId("roles_role")
        .setLabel("Role ID")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder().addComponents(msgIdInput),
        new ActionRowBuilder().addComponents(emojiInput),
        new ActionRowBuilder().addComponents(roleInput)
      );

      return interaction.showModal(modal);
    }

    // ===========================
    // /deratization
    // ===========================
    if (interaction.commandName === "deratization") {
      const sub = interaction.options.getSubcommand();

      let member = await guild.members.fetch(interaction.user.id);
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

        return interaction.reply("🔒 deratization started bitch");
      }

      if (sub === "end") {
        await channel.permissionOverwrites.edit(guild.roles.everyone, {
          SendMessages: true
        });

        return interaction.reply("🔓 deratization ended bitch");
      }
    }

    // ===========================
    // /pic submit
    // ===========================
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

    // ===========================
    // /statuschannel set
    // ===========================
    if (interaction.commandName === "statuschannel") {
      const sub = interaction.options.getSubcommand();

      let member = await guild.members.fetch(interaction.user.id);
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

    // ===========================
    // /shutdown
    // ===========================
    if (interaction.commandName === "shutdown") {
      let member = await guild.members.fetch(interaction.user.id);
      if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return interaction.reply({
          content: "nice try bitch, but ur a bit too young for that.",
          ephemeral: true
        });
      }

      await updateStatus("shutdown");

      return interaction.reply("⛔ shutdown activated bitch");
    }

    // ===========================
    // /bot lock / unlock
    // ===========================
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
        await updateStatus("locked");

        return interaction.reply("🔒 bot locked bitch");
      }

      if (sub === "unlock") {
        if (interaction.user.id !== BOT_MASTER) {
          return interaction.reply({
            content: "only master can unlock me bitch",
            ephemeral: true
          });
        }

        botLocked = false;
        await updateStatus("unlocked");

        return interaction.reply("🔓 bot unlocked bitch");
      }
    }

    // ===========================
    // /announcement
    // ===========================
    if (interaction.commandName === "announcement") {
      let member = await guild.members.fetch(interaction.user.id);

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
    await updateStatus("error");

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
    await updateStatus("error");
  }
});

// LOGIN
client.login(process.env.TOKEN)
  .then(() => console.log("Logging in..."))
  .catch(err => {
    console.error("LOGIN FAILED");
    console.error(err);
  });
