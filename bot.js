// ===============================
// ERROR LOGGING + STATUS UPDATE
// ===============================
process.on("uncaughtException", async (err) => {
  console.error("UNCAUGHT ERROR:", err);
});

process.on("unhandledRejection", async (err) => {
  console.error("UNHANDLED PROMISE:", err);
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

try {
  if (fs.existsSync("streak.json")) {
    const data = JSON.parse(fs.readFileSync("streak.json", "utf8"));
    dailyStreak = data.dailyStreak || 0;
  }
} catch (err) {
  console.error("Failed to load streak:", err);
}

function saveStreak() {
  fs.writeFileSync("streak.json", JSON.stringify({ dailyStreak }));
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

// PIC SUBMIT TRACKING
const picSubmitUsers = new Set();

// ===============================
// READY EVENT
// ===============================
client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);

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
      // ANNOUNCEMENT
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

      // DEADCHAT
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

      // CMD LIST
      new SlashCommandBuilder()
        .setName("cmd")
        .setDescription("show all commands bitch"),

      // DERATIZATION
      new SlashCommandBuilder()
        .setName("deratization")
        .setDescription("lock/unlock channel bitch")
        .addSubcommand(sub => sub.setName("start").setDescription("lock channel"))
        .addSubcommand(sub => sub.setName("end").setDescription("unlock channel")),

      // PIC SUBMIT
      new SlashCommandBuilder()
        .setName("pic")
        .setDescription("pic suggestion bitch")
        .addSubcommand(sub => sub.setName("submit").setDescription("submit a pic bitch")),

      // STATUS SYSTEM
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

      // SHUTDOWN
      new SlashCommandBuilder()
        .setName("shutdown")
        .setDescription("set system to shutdown bitch"),

      // BOT LOCK
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

      // REACTION ROLES — NEW VERSION
      new SlashCommandBuilder()
        .setName("rolescreate")
        .setDescription("create reaction roles bitch")
        .addStringOption(opt =>
          opt.setName("msgid")
            .setDescription("Message ID bitch")
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName("roles")
            .setDescription("Format: emoji:roleID, emoji:roleID, ...")
            .setRequired(true)
        )
    ]);

    console.log("slash commands registered");
  } catch (err) {
    console.error("Command registration error:", err);
  }

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
      saveStreak();

      const channel = await client.channels.fetch(DAILY_CHANNEL).catch(() => null);
      if (!channel) return;

      const embed = new EmbedBuilder()
        .setColor("#ED0000")
        .setDescription(
          "-burps- -grabs pen- YO YO YO, another day another wordle & connections mashup 😆!\n\n" +
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

// ===============================
// INTERACTION HANDLER
// ===============================
client.on("interactionCreate", async (interaction) => {
  try {
    if (botLocked && interaction.user.id !== BOT_MASTER) {
      return;
    }

    // ===========================
    // STATUS MODAL SUBMIT
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

    // ===========================
    // EMBED CREATOR MODAL SUBMIT
    // ===========================
    if (interaction.isModalSubmit() && interaction.customId === "embed_modal") {

      const channelsRaw = interaction.fields.getTextInputValue("embed_channels");
      const title = interaction.fields.getTextInputValue("embed_title");
      const desc = interaction.fields.getTextInputValue("embed_desc");
      const color = interaction.fields.getTextInputValue("embed_color");
      const footer = interaction.fields.getTextInputValue("embed_footer");

      const channelIds = channelsRaw
        .split(",")
        .map(id => id.trim())
        .filter(id => id.length > 0);

      if (channelIds.length === 0) {
        return interaction.reply({
          content: "no channels provided bitch",
          ephemeral: true
        });
      }

      const embed = new EmbedBuilder().setDescription(desc);

      if (title) embed.setTitle(title);
      if (color) embed.setColor(color);
      else embed.setColor("#ED0000");
      if (footer) embed.setFooter({ text: footer });

      for (const id of channelIds) {
        const ch = await interaction.guild.channels.fetch(id).catch(() => null);
        if (!ch) continue;
        await ch.send({ embeds: [embed] });
      }

      return interaction.reply({
        content: "✔ embed sent bitch",
        ephemeral: true
      });
    }

    // ===========================
    // REACTION ROLES — NEW SYSTEM
    // ===========================
    if (interaction.isChatInputCommand() && interaction.commandName === "rolescreate") {

      let member = await interaction.guild.members.fetch(interaction.user.id);
      if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return interaction.reply({
          content: "nice try bitch, but ur a bit too young for that.",
          ephemeral: true
        });
      }

      const msgId = interaction.options.getString("msgid");
      const rolesRaw = interaction.options.getString("roles");

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

      const pairs = rolesRaw.split(",").map(p => p.trim());
      let buttons = [];

      for (const pair of pairs) {
        const [emoji, roleId] = pair.split(":").map(x => x.trim());
        if (!emoji || !roleId) continue;

        const btn = new ButtonBuilder()
          .setCustomId(`rr_${roleId}`)
          .setEmoji(emoji)
          .setStyle(ButtonStyle.Secondary);

        buttons.push(btn);
      }

      let existingRows = targetMsg.components || [];
      let newRows = [...existingRows];

      let currentRow = newRows.length > 0 ? newRows[newRows.length - 1] : null;

      if (!currentRow || currentRow.components.length >= 5) {
        currentRow = new ActionRowBuilder();
        newRows.push(currentRow);
      }

      for (const btn of buttons) {
        if (currentRow.components.length >= 5) {
          currentRow = new ActionRowBuilder();
          newRows.push(currentRow);
        }
        currentRow.addComponents(btn);
      }

      await targetMsg.edit({ components: newRows });

      return interaction.reply({
        content: "✔ reaction roles added bitch",
        ephemeral: true
      });
    }

    // ===========================
    // REACTION ROLE BUTTON HANDLER
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

    // CMD LIST
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

    // DERATIZATION
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

    // PIC SUBMIT
    if (interaction.commandName === "pic") {
      const sub = interaction