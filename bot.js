// ===============================
// ERROR LOGGING
// ===============================
process.on("uncaughtException", (err) => console.error("UNCAUGHT ERROR:", err));
process.on("unhandledRejection", (err) => console.error("UNHANDLED PROMISE:", err));

console.log("Bot.js se spustil...");

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
// DAILY STREAK
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

let deadchatEnabled = false;
let botLocked = false;

const picSubmitUsers = new Set();

// ===============================
// READY
// ===============================
client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  await client.user.setPresence({
    status: "idle",
    activities: [{ name: "⇢ ˗ˏˋ Olgasm; V0.5 ࿐ྂ", type: 1 }]
  });

  // ===============================
  // REGISTER SLASH COMMANDS
  // ===============================
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

    // REACTION ROLES — FULL SLASH VERSION
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
      )
  ]);

  console.log("Slash commands registered.");

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
        .setDescription(`<@&${DEADCHAT_ROLE}> -hears a pin fall- WAKE UP BITCHES`);

      await channel.send({
        content: `<@&${DEADCHAT_ROLE}>`,
        embeds: [embed]
      });
    } catch (err) {
      console.error("Deadchat:", err);
    }
  }, DEADCHAT_INTERVAL);

  // ===============================
  // DAILY WORDLE REMINDER
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
          "-burps- YO YO YO, another day another wordle 😆!\n\n" +
          `**🔥 Current Streak : ${dailyStreak}**`
        );

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

    // BOT LOCK
    if (botLocked && interaction.user.id !== BOT_MASTER) return;

    // ===========================
    // EMBED CREATE – SHOW MODAL
    // ===========================
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

    // ===========================
    // EMBED CREATE – SUBMIT
    // ===========================
    if (interaction.isModalSubmit() && interaction.customId === "embed_modal") {

      const channelsRaw = interaction.fields.getTextInputValue("embed_channels");
      const title = interaction.fields.getTextInputValue("embed_title");
      const desc = interaction.fields.getTextInputValue("embed_desc");
      const color = interaction.fields.getTextInputValue("embed_color");
      const footer = interaction.fields.getTextInputValue("embed_footer");

      const channelIds = channelsRaw.split(",").map(id => id.trim());

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

    // ===========================
    // REACTION ROLE BUTTON HANDLER
    // ===========================
    if (interaction.isButton() && interaction.customId.startsWith("rr_")) {

      const roleId = interaction.customId.replace("rr_", "");
      const role = interaction.guild.roles.cache.get(roleId);

      if (!role) {
        return interaction.reply({ content: "role not found bitch", ephemeral: true });
      }

      const member = interaction.guild.members.cache.get(interaction.user.id);

      if (member.roles.cache.has(roleId)) {
        await member.roles.remove(roleId);
        return interaction.reply({
          content: `✔ removed <@&${roleId}>`,
          ephemeral: true
        });
      } else {
        await member.roles.add(roleId);
        return interaction.reply({
          content: `✔ added <@&${roleId}>`,
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
    // /rolescreate – NEW SYSTEM
    // ===========================
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

      const emojis = emojisRaw.split(",").map(e => e.trim());

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

      // Convert existing components
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

      // Create new buttons
      let newButtons = [];
      for (let i = 0; i < roles.length; i++) {
        const btn = new ButtonBuilder()
          .setCustomId(`rr_${roles[i].id}`)
          .setEmoji(emojis[i])
          .setStyle(ButtonStyle.Secondary);
        newButtons.push(btn);
      }

      // Append buttons
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

    // ===========================
    // /cmd
    // ===========================
    if (interaction.commandName === "cmd") {
      const embed = new EmbedBuilder()
        .setTitle("Command list – Page 1/1")
        .setColor("#ED0000")
        .setDescription(
          [
            "**/announcement**",
            "**/deadchat**",
            "**/deratization start / end**",
            "**/pic submit**",
            "**/statuschannel set**",
            "**/shutdown**",
            "**/bot lock / unlock**",
            "**/embed create**",
            "**/rolescreate**"
          ].join("\n")
        );

      return interaction.reply({ embeds: [embed] });
    }

    // ===========================
    // /deratization
    // ===========================
    if (interaction.commandName === "deratization") {
      const sub = interaction.options.getSubcommand();

      let member = await guild.members.fetch(interaction.user.id);
      if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return interaction.reply({
          content: "no perms bitch",
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
          .setDescription("send me the pic bitch, right here in DM");

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
          content: "no perms bitch",
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
          content: "no perms bitch",
          ephemeral: true
        });
      }

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
          .setDescription("❌ no perms bitch");

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
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }));

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
        .setDescription("✔ successfully sent bitch");

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
// ===============================
// DM PIC SUBMIT LISTENER
// ===============================
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
      .setDescription("✔ picture submitted bitch");

    await msg.reply({ embeds: [confirmEmbed] });

    // post to suggestion channel
    const channel = await client.channels.fetch(PIC_CHANNEL).catch(() => null);
    if (!channel) return;

    const postEmbed = new EmbedBuilder()
      .setColor("#ED0000")
      .setTitle("New pic suggestion")
      .setDescription(`suggested by <@${msg.author.id}>`)
      .setImage(attachment.url)
      .setTimestamp();

    await channel.send({ embeds: [postEmbed] });

  } catch (err) {
    console.error("DM pic submit error:", err);
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
