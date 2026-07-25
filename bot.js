// ===============================
// ERROR LOGGING
// ===============================
process.on("uncaughtException", (err) => console.error("UNCAUGHT ERROR:", err));
process.on("unhandledRejection", (err) => console.error("UNHANDLED PROMISE:", err));

console.log("Bot.js starting...");

// ===============================
// FILE STORAGE
// ===============================
const fs = require("fs");

function loadJson(path, def) {
  try {
    if (fs.existsSync(path)) {
      return JSON.parse(fs.readFileSync(path, "utf8"));
    }
  } catch (e) {
    console.error("Failed to load", path, e);
  }
  return def;
}

function saveJson(path, data) {
  try {
    fs.writeFileSync(path, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("Failed to save", path, e);
  }
}

// XP / messages / levels
let xpData = loadJson("xpData.json", {
  users: {}, // userId: { xp, messages, bestDays, lastBestChange }
  bestUserId: null,
  bestSince: null
});

// warns
let warnsData = loadJson("warns.json", {
  users: {} // userId: [{ moderatorId, reason, timestamp }]
});

// family
let familyData = loadJson("family.json", {
  marriages: [], // { a, b }
  parents: [],   // { parent, child }
});

// ground (mute-like)
let groundData = loadJson("ground.json", {
  users: {} // userId: { until, reason }
});

// daily streak
let dailyStreakData = loadJson("streak.json", { dailyStreak: 0 });
let dailyStreak = dailyStreakData.dailyStreak || 0;

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
  console.error("TOKEN missing.");
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
// CONFIG
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

const LEVEL_CHANNEL = "1517175386021040138";

const ROLE_TOP = "1530588478352654407";
const ROLE_2 = "1530588534606528632";
const ROLE_3 = "1530588669956722770";
const ROLE_4 = "1530588839163199540";
const ROLE_5 = "1530589017140236419";
const ROLE_6 = "1530588907509514360";
const ROLE_BASE = "1530590724192473240";

const XP_THRESHOLDS = [
  { role: ROLE_BASE, xp: 0 },
  { role: ROLE_6, xp: 25000 },
  { role: ROLE_5, xp: 50000 },
  { role: ROLE_4, xp: 100000 },
  { role: ROLE_3, xp: 150000 },
  { role: ROLE_2, xp: 500000 },
  { role: ROLE_TOP, xp: 1000000 }
];

let deadchatEnabled = false;
let botLocked = false;
let roastEnabled = false;

const picSubmitUsers = new Set();

// ===============================
// READY
// ===============================
client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  await client.user.setPresence({
    status: "idle",
    activities: [{ name: "⇢ ˗ˏˋ Olgasm; V0.6 ࿐ྂ", type: 1 }]
  });

  // REGISTER SLASH COMMANDS
  await client.application.commands.set([
    // ANNOUNCEMENT
    new SlashCommandBuilder()
      .setName("announcement")
      .setDescription("send an announcement bitch")
      .addStringOption(o => o.setName("title").setDescription("title").setRequired(true))
      .addStringOption(o => o.setName("description").setDescription("desc").setRequired(true))
      .addStringOption(o =>
        o.setName("ping")
          .setDescription("ping type")
          .addChoices(
            { name: "everyone", value: "everyone" },
            { name: "events", value: "events" },
            { name: "none", value: "none" }
          )
          .setRequired(true)
      ),

    // DEADCHAT
    new SlashCommandBuilder()
      .setName("deadchat")
      .setDescription("toggle deadchat")
      .addStringOption(o =>
        o.setName("mode")
          .setDescription("on/off")
          .addChoices({ name: "on", value: "on" }, { name: "off", value: "off" })
          .setRequired(true)
      ),

    // CMD LIST
    new SlashCommandBuilder().setName("cmd").setDescription("show all commands"),

    // DERATIZATION
    new SlashCommandBuilder()
      .setName("deratization")
      .setDescription("lock/unlock channel")
      .addSubcommand(s => s.setName("start").setDescription("lock"))
      .addSubcommand(s => s.setName("end").setDescription("unlock")),

    // PIC SUBMIT
    new SlashCommandBuilder()
      .setName("pic")
      .setDescription("pic suggestion")
      .addSubcommand(s => s.setName("submit").setDescription("submit a pic")),

    // STATUS SYSTEM
    new SlashCommandBuilder()
      .setName("statuschannel")
      .setDescription("configure status system")
      .addSubcommand(s =>
        s.setName("set")
          .setDescription("set status channel")
          .addAttachmentOption(o => o.setName("image").setDescription("optional image"))
      ),

    // SHUTDOWN
    new SlashCommandBuilder().setName("shutdown").setDescription("shutdown"),

    // BOT LOCK
    new SlashCommandBuilder()
      .setName("bot")
      .setDescription("lock/unlock bot")
      .addSubcommand(s => s.setName("lock").setDescription("lock bot"))
      .addSubcommand(s => s.setName("unlock").setDescription("unlock bot")),

    // EMBED CREATOR
    new SlashCommandBuilder()
      .setName("embed")
      .setDescription("create embed")
      .addSubcommand(s => s.setName("create").setDescription("create embed")),

    // REACTION ROLES
    new SlashCommandBuilder()
      .setName("rolescreate")
      .setDescription("create reaction roles")
      .addStringOption(o =>
        o.setName("msgid")
          .setDescription("Message ID")
          .setRequired(true)
      )
      .addStringOption(o =>
        o.setName("emojis")
          .setDescription("Emojis (comma separated)")
          .setRequired(true)
      )
      .addRoleOption(o =>
        o.setName("role1")
          .setDescription("Role 1")
          .setRequired(true)
      )
      .addRoleOption(o =>
        o.setName("role2")
          .setDescription("Role 2")
      )
      .addRoleOption(o =>
        o.setName("role3")
          .setDescription("Role 3")
      ),

    // MODERATION: KICK / BAN / WARN / WARNLOGS
    new SlashCommandBuilder()
      .setName("kick")
      .setDescription("kick a bitch")
      .addUserOption(o => o.setName("user").setDescription("target").setRequired(true))
      .addStringOption(o => o.setName("reason").setDescription("reason").setRequired(false)),

    new SlashCommandBuilder()
      .setName("ban")
      .setDescription("ban a bitch")
      .addUserOption(o => o.setName("user").setDescription("target").setRequired(true))
      .addStringOption(o => o.setName("reason").setDescription("reason").setRequired(false)),

    new SlashCommandBuilder()
      .setName("warn")
      .setDescription("warn a bitch")
      .addUserOption(o => o.setName("user").setDescription("target").setRequired(true))
      .addStringOption(o => o.setName("reason").setDescription("reason").setRequired(true)),

    new SlashCommandBuilder()
      .setName("warnlogs")
      .setDescription("show warn logs")
      .addUserOption(o => o.setName("user").setDescription("target").setRequired(true)),

    // GROUND / UNGROUND
    new SlashCommandBuilder()
      .setName("ground")
      .setDescription("ground (mute) a bitch")
      .addUserOption(o => o.setName("user").setDescription("target").setRequired(true))
      .addIntegerOption(o => o.setName("duration").setDescription("minutes").setRequired(true))
      .addStringOption(o => o.setName("reason").setDescription("reason").setRequired(true)),

    new SlashCommandBuilder()
      .setName("unground")
      .setDescription("unground a bitch")
      .addUserOption(o => o.setName("user").setDescription("target").setRequired(true)),

    // ROAST
    new SlashCommandBuilder()
      .setName("roast")
      .setDescription("toggle roast mode")
      .addStringOption(o =>
        o.setName("mode")
          .setDescription("on/off")
          .addChoices({ name: "on", value: "on" }, { name: "off", value: "off" })
          .setRequired(true)
      ),

    // FAMILY
    new SlashCommandBuilder()
      .setName("marry")
      .setDescription("marry a bitch")
      .addUserOption(o => o.setName("user").setDescription("partner").setRequired(true)),

    new SlashCommandBuilder()
      .setName("divorce")
      .setDescription("divorce a bitch")
      .addUserOption(o => o.setName("user").setDescription("partner").setRequired(true)),

    new SlashCommandBuilder()
      .setName("adopt")
      .setDescription("adopt a bitch")
      .addUserOption(o => o.setName("user").setDescription("child").setRequired(true)),

    new SlashCommandBuilder()
      .setName("abandon")
      .setDescription("abandon a bitch")
      .addUserOption(o => o.setName("user").setDescription("child").setRequired(true)),

    new SlashCommandBuilder()
      .setName("familytree")
      .setDescription("show your family tree"),

    // XP / LEVELS
    new SlashCommandBuilder()
      .setName("leaderboard")
      .setDescription("show leaderboard")
      .addStringOption(o =>
        o.setName("type")
          .setDescription("messages")
          .addChoices({ name: "messages", value: "messages" })
          .setRequired(true)
      ),

    new SlashCommandBuilder()
      .setName("stats")
      .setDescription("show your stats"),

    new SlashCommandBuilder()
      .setName("xp")
      .setDescription("xp admin stuff")
      .addSubcommand(s =>
        s.setName("delete")
          .setDescription("delete user xp")
          .addUserOption(o => o.setName("user").setDescription("target").setRequired(true))
      )
  ]);

  console.log("Slash commands registered.");

  // DEADCHAT LOOP
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

  // DAILY WORDLE REMINDER
  setInterval(async () => {
    const now = new Date();
    const estTime = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
    const hours = estTime.getHours();
    const minutes = estTime.getMinutes();

    if (hours === 18 && minutes === 15) {
      dailyStreak++;
      saveJson("streak.json", { dailyStreak });

      const channel = await client.channels.fetch(DAILY_CHANNEL).catch(() => null);
      if (!channel) return;

      const embed = new EmbedBuilder()
        .setColor("#ED0000")
        .setDescription(
          "-burps- YO YO YO, another day another wordle 😆!\n\n" +
          `**🔥 Current Streak : ${dailyStreak}**`
        )
        .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." });

      await channel.send({
        content: `<@&${DAILY_ROLE}>`,
        embeds: [embed]
      });
    }

  }, 60 * 1000);

  // INITIAL BASE ROLE ASSIGN + ANNOUNCE
  try {
    const guilds = client.guilds.cache;
    for (const [, guild] of guilds) {
      await guild.members.fetch();
      const channel = guild.channels.cache.get(LEVEL_CHANNEL);
      if (!channel) continue;

      for (const [, member] of guild.members.cache) {
        if (member.user.bot) continue;
        if (!member.roles.cache.has(ROLE_BASE)) {
          await member.roles.add(ROLE_BASE).catch(() => {});
          const embed = new EmbedBuilder()
            .setColor("#ED0000")
            .setDescription(
              `-uncontrollably laughs- welcome to chat leveling, bitch!\n` +
              `<@${member.id}> is now <@&${ROLE_BASE}>`
            )
            .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." });
          await channel.send({ content: `<@${member.id}>`, embeds: [embed] });
        }
      }
    }
  } catch (e) {
    console.error("Initial base role assign error:", e);
  }

  // BEST USER CHECK EVERY 10 MIN
  setInterval(async () => {
    try {
      let bestId = null;
      let bestMessages = -1;
      for (const uid in xpData.users) {
        const u = xpData.users[uid];
        if (u.messages > bestMessages) {
          bestMessages = u.messages;
          bestId = uid;
        }
      }
      if (!bestId) return;

      if (xpData.bestUserId !== bestId) {
        const oldBest = xpData.bestUserId;
        xpData.bestUserId = bestId;
        xpData.bestSince = Date.now();

        saveJson("xpData.json", xpData);

        const guilds = client.guilds.cache;
        for (const [, guild] of guilds) {
          const channel = guild.channels.cache.get(LEVEL_CHANNEL);
          if (!channel) continue;

          const oldMember = oldBest ? guild.members.cache.get(oldBest) : null;
          const newMember = guild.members.cache.get(bestId);
          if (!newMember) continue;

          // remove ROLE_TOP from old
          if (oldMember && oldMember.roles.cache.has(ROLE_TOP)) {
            await oldMember.roles.remove(ROLE_TOP).catch(() => {});
          }
          // give ROLE_TOP to new
          if (!newMember.roles.cache.has(ROLE_TOP)) {
            await newMember.roles.add(ROLE_TOP).catch(() => {});
          }

          const embed = new EmbedBuilder()
            .setColor("#ED0000")
            .setDescription(
              `-uncontrollably laughs- -points disgustingly- pffth, look at <@${oldBest}> , once the best, now an L!\n` +
              `<@${newMember.id}> is now <@&${ROLE_TOP}>`
            )
            .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." });

          await channel.send({ content: `<@${newMember.id}>`, embeds: [embed] });
        }
      }
    } catch (e) {
      console.error("Best user check error:", e);
    }
  }, 10 * 60 * 1000);

  // ROAST LOOP
  setInterval(async () => {
    if (!roastEnabled) return;
    try {
      const guilds = client.guilds.cache;
      for (const [, guild] of guilds) {
        await guild.members.fetch();
        const members = guild.members.cache.filter(m => !m.user.bot);
        if (members.size === 0) continue;
        const arr = [...members.values()];
        const target = arr[Math.floor(Math.random() * arr.length)];
        const channel = guild.channels.cache.get(LEVEL_CHANNEL);
        if (!channel) continue;

        const lines = [
          "go work out, bitch, your fat ass needs it.",
          "go lose some weight, bitch.",
          "you look like a walking donut, go gym.",
          "cardio, bitch. now.",
          "your body screams help, go lift."
        ];
        const line = lines[Math.floor(Math.random() * lines.length)];

        const embed = new EmbedBuilder()
          .setColor("#ED0000")
          .setDescription(`<@${target.id}> ${line}`)
          .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." });

        await channel.send({ content: `<@${target.id}>`, embeds: [embed] });
      }
    } catch (e) {
      console.error("Roast loop error:", e);
    }
  }, 5 * 60 * 1000);
});

// ===============================
// INTERACTION HANDLER
// ===============================
client.on("interactionCreate", async (interaction) => {
  try {
    if (botLocked && interaction.user.id !== BOT_MASTER) return;

    // EMBED CREATE – SHOW MODAL
    if (interaction.isChatInputCommand() && interaction.commandName === "embed") {
      const sub = interaction.options.getSubcommand();
      if (sub === "create") {
        const modal = new ModalBuilder()
          .setCustomId("embed_modal")
          .setTitle("Custom Embed Creator");

        const channelsInput = new TextInputBuilder()
          .setCustomId("embed_channels")
          .setLabel("Channel IDs (comma separated)")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true);

        const titleInput = new TextInputBuilder()
          .setCustomId("embed_title")
          .setLabel("Title")
          .setStyle(TextInputStyle.Short)
          .setRequired(false);

        const descInput = new TextInputBuilder()
          .setCustomId("embed_desc")
          .setLabel("Description")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true);

        const colorInput = new TextInputBuilder()
          .setCustomId("embed_color")
          .setLabel("Color HEX")
          .setStyle(TextInputStyle.Short)
          .setRequired(false);

        const footerInput = new TextInputBuilder()
          .setCustomId("embed_footer")
          .setLabel("Footer")
          .setStyle(TextInputStyle.Short)
          .setRequired(false);

        modal.addComponents(
          new ActionRowBuilder().addComponents(channelsInput),
          new ActionRowBuilder().addComponents(titleInput),
          new ActionRowBuilder().addComponents(descInput),
          new ActionRowBuilder().addComponents(colorInput),
          new ActionRowBuilder().addComponents(footerInput)
        );

        return interaction.showModal(modal);
      }
    }

    // EMBED CREATE – SUBMIT
    if (interaction.isModalSubmit() && interaction.customId === "embed_modal") {
      const channelsRaw = interaction.fields.getTextInputValue("embed_channels");
      const title = interaction.fields.getTextInputValue("embed_title");
      const desc = interaction.fields.getTextInputValue("embed_desc");
      const color = interaction.fields.getTextInputValue("embed_color");
      const footer = interaction.fields.getTextInputValue("embed_footer");

      const channelIds = channelsRaw.split(",").map(id => id.trim()).filter(Boolean);

      const embed = new EmbedBuilder().setDescription(desc);
      if (title) embed.setTitle(title);
      if (color) embed.setColor(color);
      else embed.setColor("#ED0000");
      if (footer) embed.setFooter({ text: footer });

      for (const id of channelIds) {
        const ch = await interaction.guild.channels.fetch(id).catch(() => null);
        if (ch) await ch.send({ embeds: [embed] });
      }

      return interaction.reply({
        content: "✔ embed sent bitch",
        ephemeral: true
      });
    }

    // REACTION ROLE BUTTON
    if (interaction.isButton() && interaction.customId.startsWith("rr_")) {
      const roleId = interaction.customId.replace("rr_", "");
      const role = interaction.guild.roles.cache.get(roleId);
      if (!role) {
        return interaction.reply({ content: "role not found bitch", ephemeral: true });
      }
      const member = interaction.guild.members.cache.get(interaction.user.id);
      if (member.roles.cache.has(roleId)) {
        await member.roles.remove(roleId);
        return interaction.reply({ content: `✔ removed <@&${roleId}>`, ephemeral: true });
      } else {
        await member.roles.add(roleId);
        return interaction.reply({ content: `✔ added <@&${roleId}>`, ephemeral: true });
      }
    }

    // STATUS MODAL SUBMIT
    if (interaction.isModalSubmit() && interaction.customId === "status_modal") {
      const channelId = interaction.fields.getTextInputValue("channel");
      const operational = interaction.fields.getTextInputValue("operational");
      const error = interaction.fields.getTextInputValue("error");
      const shutdown = interaction.fields.getTextInputValue("shutdown");

      const channel = await interaction.guild.channels.fetch(channelId).catch(() => null);
      if (!channel) {
        return interaction.reply({ content: "channel not found bitch", ephemeral: true });
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

      return interaction.reply({ content: "status system configured bitch", ephemeral: true });
    }

    // SLASH COMMANDS
    if (!interaction.isChatInputCommand()) return;

    const guild = interaction.guild;

    // rolescreate
    if (interaction.commandName === "rolescreate") {
      let member = await guild.members.fetch(interaction.user.id);
      if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return interaction.reply({ content: "no perms bitch", ephemeral: true });
      }

      const msgId = interaction.options.getString("msgid");
      const emojisRaw = interaction.options.getString("emojis");

      const roles = [
        interaction.options.getRole("role1"),
        interaction.options.getRole("role2"),
        interaction.options.getRole("role3")
      ].filter(r => r);

      const emojis = emojisRaw.split(",").map(e => e.trim()).filter(Boolean);

      if (emojis.length !== roles.length) {
        return interaction.reply({
          content: "emoji count must match role count bitch",
          ephemeral: true
        });
      }

      let targetMsg;
      try {
        targetMsg = await interaction.channel.messages.fetch(msgId);
      } catch {
        return interaction.reply({
          content: "cant find that message bitch",
          ephemeral: true
        });
      }

      let existingRows = [];
      if (targetMsg.components.length > 0) {
        for (const row of targetMsg.components) {
          const newRow = new ActionRowBuilder();
          for (const comp of row.components) {
            const btn = new ButtonBuilder()
              .setCustomId(comp.customId)
              .setEmoji(comp.emoji)
              .setStyle(comp.style);
            newRow.addComponents(btn);
          }
          existingRows.push(newRow);
        }
      }

      let newButtons = [];
      for (let i = 0; i < roles.length; i++) {
        const btn = new ButtonBuilder()
          .setCustomId(`rr_${roles[i].id}`)
          .setEmoji(emojis[i])
          .setStyle(ButtonStyle.Secondary);
        newButtons.push(btn);
      }

      let rows = existingRows;
      let currentRow = rows.length > 0 ? rows[rows.length - 1] : null;

      if (!currentRow || currentRow.components.length >= 5) {
        currentRow = new ActionRowBuilder();
        rows.push(currentRow);
      }

      for (const btn of newButtons) {
        if (currentRow.components.length >= 5) {
          currentRow = new ActionRowBuilder();
          rows.push(currentRow);
        }
        currentRow.addComponents(btn);
      }

      await targetMsg.edit({ components: rows });

      return interaction.reply({
        content: "✔ reaction roles added bitch",
        ephemeral: true
      });
    }

    // cmd
    if (interaction.commandName === "cmd") {
      const embed = new EmbedBuilder()
        .setTitle("Command list – Page 1/1")
        .setColor("#ED0000")
        .setDescription(
          [
            "/announcement",
            "/deadchat",
            "/deratization start/end",
            "/pic submit",
            "/statuschannel set",
            "/shutdown",
            "/bot lock/unlock",
            "/embed create",
            "/rolescreate",
            "/kick",
            "/ban",
            "/warn",
            "/warnlogs",
            "/ground",
            "/unground",
            "/roast",
            "/marry",
            "/divorce",
            "/adopt",
            "/abandon",
            "/familytree",
            "/leaderboard messages",
            "/stats",
            "/xp delete"
          ].join("\n")
        )
        .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." });

      return interaction.reply({ embeds: [embed] });
    }

    // deratization
    if (interaction.commandName === "deratization") {
      const sub = interaction.options.getSubcommand();
      let member = await guild.members.fetch(interaction.user.id);
      if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return interaction.reply({ content: "no perms bitch", ephemeral: true });
      }
      const channel = interaction.channel;
      if (sub === "start") {
        await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: false });
        return interaction.reply("🔒 deratization started bitch");
      }
      if (sub === "end") {
        await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: true });
        return interaction.reply("🔓 deratization ended bitch");
      }
    }

    // pic submit
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

    // statuschannel
    if (interaction.commandName === "statuschannel") {
      const sub = interaction.options.getSubcommand();
      let member = await guild.members.fetch(interaction.user.id);
      if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return interaction.reply({ content: "no perms bitch", ephemeral: true });
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

    // shutdown
    if (interaction.commandName === "shutdown") {
      let member = await guild.members.fetch(interaction.user.id);
      if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return interaction.reply({ content: "no perms bitch", ephemeral: true });
      }
      return interaction.reply("⛔ shutdown activated bitch");
    }

    // bot lock/unlock
    if (interaction.commandName === "bot") {
      const sub = interaction.options.getSubcommand();
      if (sub === "lock") {
        if (interaction.user.id !== BOT_MASTER) {
          return interaction.reply({ content: "only master can lock me bitch", ephemeral: true });
        }
        botLocked = true;
        return interaction.reply("🔒 bot locked bitch");
      }
      if (sub === "unlock") {
        if (interaction.user.id !== BOT_MASTER) {
          return interaction.reply({ content: "only master can unlock me bitch", ephemeral: true });
        }
        botLocked = false;
        return interaction.reply("🔓 bot unlocked bitch");
      }
    }

    // announcement
    if (interaction.commandName === "announcement") {
      let member = await guild.members.fetch(interaction.user.id);
      if (!member.roles.cache.has(PERMISSION_ROLE)) {
        const errorEmbed = new EmbedBuilder()
          .setColor("#ED0000")
          .setDescription("❌ no perms bitch")
          .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." });
        return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
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

      await interaction.reply({ embeds: [confirmEmbed] });
    }

    // MODERATION: kick
    if (interaction.commandName === "kick") {
      let member = await guild.members.fetch(interaction.user.id);
      if (!member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
        return interaction.reply({ content: "no perms bitch", ephemeral: true });
      }
      const target = interaction.options.getUser("user");
      const reason = interaction.options.getString("reason") || "no reason, bitch";
      const targetMember = await guild.members.fetch(target.id).catch(() => null);
      if (!targetMember) {
        return interaction.reply({ content: "cant find that bitch", ephemeral: true });
      }
      await targetMember.kick(reason).catch(() => {});
      const embed = new EmbedBuilder()
        .setColor("#ED0000")
        .setDescription(`✔ kicked <@${target.id}> for: ${reason}`)
        .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." });
      return interaction.reply({ embeds: [embed] });
    }

    // MODERATION: ban
    if (interaction.commandName === "ban") {
      let member = await guild.members.fetch(interaction.user.id);
      if (!member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
        return interaction.reply({ content: "no perms bitch", ephemeral: true });
      }
      const target = interaction.options.getUser("user");
      const reason = interaction.options.getString("reason") || "no reason, bitch";
      const targetMember = await guild.members.fetch(target.id).catch(() => null);
      if (!targetMember) {
        return interaction.reply({ content: "cant find that bitch", ephemeral: true });
      }
      await targetMember.ban({ reason }).catch(() => {});
      const embed = new EmbedBuilder()
        .setColor("#ED0000")
        .setDescription(`✔ banned <@${target.id}> for: ${reason}`)
        .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." });
      return interaction.reply({ embeds: [embed] });
    }

    // MODERATION: warn
    if (interaction.commandName === "warn") {
      let member = await guild.members.fetch(interaction.user.id);
      if (!member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
        return interaction.reply({ content: "no perms bitch", ephemeral: true });
      }
      const target = interaction.options.getUser("user");
      const reason = interaction.options.getString("reason");
      if (!warnsData.users[target.id]) warnsData.users[target.id] = [];
      warnsData.users[target.id].push({
        moderatorId: interaction.user.id,
        reason,
        timestamp: Date.now()
      });
      saveJson("warns.json", warnsData);

      const embed = new EmbedBuilder()
        .setColor("#ED0000")
        .setDescription(`✔ warned <@${target.id}> for: ${reason}`)
        .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." });

      try {
        const dmEmbed = new EmbedBuilder()
          .setColor("#ED0000")
          .setDescription(`you got warned for: ${reason}, bitch.`)
          .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." });
        await target.send({ embeds: [dmEmbed] }).catch(() => {});
      } catch {}

      return interaction.reply({ embeds: [embed] });
    }

    // MODERATION: warnlogs
    if (interaction.commandName === "warnlogs") {
      const target = interaction.options.getUser("user");
      const logs = warnsData.users[target.id] || [];
      if (logs.length === 0) {
        return interaction.reply({
          content: "this bitch is clean, no warns.",
          ephemeral: true
        });
      }
      const desc = logs
        .map(
          (w, i) =>
            `**${i + 1}.** by <@${w.moderatorId}> at <t:${Math.floor(
              w.timestamp / 1000
            )}:R> – ${w.reason}`
        )
        .join("\n");

      const embed = new EmbedBuilder()
        .setColor("#ED0000")
        .setTitle(`Warn logs for ${target.tag}`)
        .setDescription(desc)
        .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." });

      return interaction.reply({ embeds: [embed] });
    }

    // GROUND
    if (interaction.commandName === "ground") {
      let member = await guild.members.fetch(interaction.user.id);
      if (!member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
        return interaction.reply({ content: "no perms bitch", ephemeral: true });
      }
      const target = interaction.options.getUser("user");
      const duration = interaction.options.getInteger("duration");
      const reason = interaction.options.getString("reason");

      const until = Date.now() + duration * 60 * 1000;
      groundData.users[target.id] = { until, reason };
      saveJson("ground.json", groundData);

      const embed = new EmbedBuilder()
        .setColor("#ED0000")
        .setDescription(
          `✔ grounded <@${target.id}> for **${duration} minutes** for: ${reason}`
        )
        .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." });

      await interaction.reply({ embeds: [embed] });

      try {
        const dmEmbed = new EmbedBuilder()
          .setColor("#ED0000")
          .setDescription(
            `you've been grounded for **${duration} minutes** due to **${reason}** , start behaving, bitch!`
          )
          .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." });
        await target.send({ embeds: [dmEmbed] }).catch(() => {});
      } catch {}
    }

    // UNGROUND
    if (interaction.commandName === "unground") {
      let member = await guild.members.fetch(interaction.user.id);
      if (!member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
        return interaction.reply({ content: "no perms bitch", ephemeral: true });
      }
      const target = interaction.options.getUser("user");
      delete groundData.users[target.id];
      saveJson("ground.json", groundData);

      const embed = new EmbedBuilder()
        .setColor("#00FF00")
        .setDescription(`✔ ungrounded <@${target.id}>`)
        .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." });

      return interaction.reply({ embeds: [embed] });
    }

    // ROAST
    if (interaction.commandName === "roast") {
      let member = await guild.members.fetch(interaction.user.id);
      if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return interaction.reply({ content: "no perms bitch", ephemeral: true });
      }
      const mode = interaction.options.getString("mode");
      roastEnabled = mode === "on";
      const embed = new EmbedBuilder()
        .setColor("#ED0000")
        .setDescription(`✔ roast mode is now **${mode}**, bitch.`)
        .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." });
      return interaction.reply({ embeds: [embed] });
    }

    // FAMILY: marry
    if (interaction.commandName === "marry") {
      const target = interaction.options.getUser("user");
      const a = interaction.user.id;
      const b = target.id;
      if (!familyData.marriages.find(m => (m.a === a && m.b === b) || (m.a === b && m.b === a))) {
        familyData.marriages.push({ a, b });
        saveJson("family.json", familyData);
      }
      const embed = new EmbedBuilder()
        .setColor("#ED0000")
        .setDescription(`✔ <@${a}> married <@${b}> , bitch.`)
        .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." });
      return interaction.reply({ embeds: [embed] });
    }

    // FAMILY: divorce
    if (interaction.commandName === "divorce") {
      const target = interaction.options.getUser("user");
      const a = interaction.user.id;
      const b = target.id;
      familyData.marriages = familyData.marriages.filter(
        m => !((m.a === a && m.b === b) || (m.a === b && m.b === a))
      );
      saveJson("family.json", familyData);
      const embed = new EmbedBuilder()
        .setColor("#ED0000")
        .setDescription(`✔ <@${a}> divorced <@${b}> , bitch.`)
        .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." });
      return interaction.reply({ embeds: [embed] });
    }

    // FAMILY: adopt
    if (interaction.commandName === "adopt") {
      const child = interaction.options.getUser("user");
      const parent = interaction.user.id;
      if (!familyData.parents.find(p => p.parent === parent && p.child === child.id)) {
        familyData.parents.push({ parent, child: child.id });
        saveJson("family.json", familyData);
      }
      const embed = new EmbedBuilder()
        .setColor("#ED0000")
        .setDescription(`✔ <@${parent}> adopted <@${child.id}> , bitch.`)
        .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." });
      return interaction.reply({ embeds: [embed] });
    }

    // FAMILY: abandon
    if (interaction.commandName === "abandon") {
      const child = interaction.options.getUser("user");
      const parent = interaction.user.id;
      familyData.parents = familyData.parents.filter(
        p => !(p.parent === parent && p.child === child.id)
      );
      saveJson("family.json", familyData);
      const embed = new EmbedBuilder()
        .setColor("#ED0000")
        .setDescription(`✔ <@${parent}> abandoned <@${child.id}> , bitch.`)
        .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." });
      return interaction.reply({ embeds: [embed] });
    }

    // FAMILYTREE
    if (interaction.commandName === "familytree") {
      const userId = interaction.user.id;
      const marriages = familyData.marriages.filter(
        m => m.a === userId || m.b === userId
      );
      const children = familyData.parents.filter(p => p.parent === userId);
      const parents = familyData.parents.filter(p => p.child === userId);

      let desc = "";
      if (marriages.length > 0) {
        desc += "**Partners:**\n" + marriages.map(m => `<@${m.a === userId ? m.b : m.a}>`).join(", ") + "\n\n";
      }
      if (children.length > 0) {
        desc += "**Children:**\n" + children.map(c => `<@${c.child}>`).join(", ") + "\n\n";
      }
      if (parents.length > 0) {
        desc += "**Parents:**\n" + parents.map(p => `<@${p.parent}>`).join(", ") + "\n\n";
      }
      if (!desc) desc = "this bitch has no family yet.";

      const embed = new EmbedBuilder()
        .setColor("#ED0000")
        .setTitle(`Family tree for ${interaction.member.displayName}`)
        .setDescription(desc)
        .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." });

      return interaction.reply({ embeds: [embed] });
    }

    // LEADERBOARD
    if (interaction.commandName === "leaderboard") {
      const type = interaction.options.getString("type");
      if (type === "messages") {
        const entries = Object.entries(xpData.users)
          .sort((a, b) => b[1].messages - a[1].messages)
          .slice(0, 3);

        if (entries.length === 0) {
          return interaction.reply({
            content: "no data yet bitch.",
            ephemeral: true
          });
        }

        let desc = "";
        entries.forEach(([uid, data], i) => {
          const fire = xpData.bestUserId === uid ? "🔥" : "";
          desc += `**${i + 1}.** <@${uid}> – ${data.messages} msgs ${fire}\n`;
        });

        const embed = new EmbedBuilder()
          .setColor("#ED0000")
          .setTitle("Top chat bitches – messages")
          .setDescription(desc)
          .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." });

        return interaction.reply({ embeds: [embed] });
      }
    }

    // STATS
    if (interaction.commandName === "stats") {
      const uid = interaction.user.id;
      const data = xpData.users[uid] || { xp: 0, messages: 0 };
      const xp = data.xp || 0;
      const messages = data.messages || 0;

      let currentIndex = 0;
      for (let i = 0; i < XP_THRESHOLDS.length; i++) {
        if (xp >= XP_THRESHOLDS[i].xp) currentIndex = i;
      }
      const current = XP_THRESHOLDS[currentIndex];
      const next = XP_THRESHOLDS[currentIndex + 1] || current;
      const needed = next.xp - xp;
      const progress = next.xp === current.xp ? 1 : xp / next.xp;
      const percent = Math.min(100, Math.floor(progress * 100));

      const filled = Math.round((percent / 100) * 6);
      const bar = "🟢".repeat(filled) + "🔴".repeat(6 - filled);

      const embed = new EmbedBuilder()
        .setColor("#ED0000")
        .setTitle(`Stats for ${interaction.member.displayName}`)
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
        .setDescription(
          `Messages: **${messages}**\n` +
          `XP: **${xp}**\n` +
          `Next level: ${bar} ${percent}%\n` +
          `XP left: **${needed <= 0 ? 0 : needed}**`
        )
        .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." });

      return interaction.reply({ embeds: [embed] });
    }

    // XP DELETE
    if (interaction.commandName === "xp") {
      const sub = interaction.options.getSubcommand();
      if (sub === "delete") {
        let member = await guild.members.fetch(interaction.user.id);
        if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) {
          return interaction.reply({ content: "no perms bitch", ephemeral: true });
        }
        const target = interaction.options.getUser("user");
        delete xpData.users[target.id];
        saveJson("xpData.json", xpData);

        const embed = new EmbedBuilder()
          .setColor("#ED0000")
          .setDescription(`✔ deleted XP for <@${target.id}> , bitch.`)
          .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." });

        await interaction.reply({ embeds: [embed] });

        try {
          const dmEmbed = new EmbedBuilder()
            .setColor("#ED0000")
            .setDescription(
              `your XP got wiped, bitch. maybe try not being such an L next time.`
            )
            .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." });
          await target.send({ embeds: [dmEmbed] }).catch(() => {});
        } catch {}
      }
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

// ===============================
// MESSAGE HANDLER – XP, GROUND
// ===============================
client.on("messageCreate", async (msg) => {
  try {
    if (!msg.guild) {
      // DM pic submit
      if (picSubmitUsers.has(msg.author.id)) {
        if (!msg.attachments || msg.attachments.size === 0) {
          return msg.reply("bitch send a **picture**, not empty air");
        }
        const attachment = msg.attachments.first();
        if (!attachment.contentType || !attachment.contentType.startsWith("image")) {
          return msg.reply("bitch that is **not** a picture");
        }
        picSubmitUsers.delete(msg.author.id);

        const confirmEmbed = new EmbedBuilder()
          .setColor("#00FF00")
          .setDescription("✔ picture submitted bitch")
          .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." });

        await msg.reply({ embeds: [confirmEmbed] });

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
      }
      return;
    }

    if (msg.author.bot) return;

    // GROUND CHECK
    const g = groundData.users[msg.author.id];
    if (g && g.until > Date.now()) {
      // delete message
      await msg.delete().catch(() => {});
      return;
    }

    // XP SYSTEM
    const uid = msg.author.id;
    if (!xpData.users[uid]) xpData.users[uid] = { xp: 0, messages: 0 };
    const userData = xpData.users[uid];

    let xpGain = 0;
    const words = msg.content.trim().split(/\s+/).filter(Boolean);
    xpGain += words.length; // 1 xp per word
    if (msg.attachments && msg.attachments.size > 0) {
      xpGain += 10; // 10 xp per image
    }

    userData.xp += xpGain;
    userData.messages += 1;

    // role update
    let currentIndex = 0;
    for (let i = 0; i < XP_THRESHOLDS.length; i++) {
      if (userData.xp >= XP_THRESHOLDS[i].xp) currentIndex = i;
    }
    const current = XP_THRESHOLDS[currentIndex];

    const member = msg.member;
    if (member) {
      // remove all level roles, then add current
      const levelRoles = XP_THRESHOLDS.map(r => r.role);
      for (const r of levelRoles) {
        if (member.roles.cache.has(r) && r !== current.role) {
          await member.roles.remove(r).catch(() => {});
        }
      }
      if (!member.roles.cache.has(current.role)) {
        await member.roles.add(current.role).catch(() => {});

        // announce level up
        const channel = msg.guild.channels.cache.get(LEVEL_CHANNEL);
        if (channel) {
          const next = XP_THRESHOLDS[currentIndex + 1] || current;
          const needed = next.xp - userData.xp;
          const embed = new EmbedBuilder()
            .setColor("#ED0000")
            .setDescription(
              `-burps- look at this bitch leveling up.\n` +
              `<@${uid}> is now <@&${current.role}>.\n` +
              `XP: **${userData.xp}** – XP left for next: **${needed <= 0 ? 0 : needed}**`
            )
            .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." });
          await channel.send({ content: `<@${uid}>`, embeds: [embed] });
        }
      }
    }

    saveJson("xpData.json", xpData);
  } catch (e) {
    console.error("messageCreate error:", e);
  }
});

// ===============================
// LOGIN
// ===============================
client.login(process.env.TOKEN)
  .then(() => console.log("Logging in..."))
  .catch(err => {
    console.error("LOGIN FAILED");
    console.error(err);
  });
