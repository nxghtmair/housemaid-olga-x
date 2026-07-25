// ===============================
// CORE, STORAGE, CONFIG
// ===============================
process.on("uncaughtException", (err) => console.error("UNCAUGHT ERROR:", err));
process.on("unhandledRejection", (err) => console.error("UNHANDLED PROMISE:", err));

console.log("Bot.js starting...");

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

// ===============================
// PERSISTENT DATA
// ===============================
let xpData = loadJson("xpData.json", {
  users: {},        // userId: { xp, messages, levelIndex }
  bestUserId: null,
  bestSince: null
});

let warnsData = loadJson("warns.json", {
  users: {}         // userId: [{ moderatorId, reason, timestamp }]
});

let familyData = loadJson("family.json", {
  marriages: [],    // { a, b }
  parents: []       // { parent, child }
});

let groundData = loadJson("ground.json", {
  users: {}         // userId: { until, reason }
});

let dailyStreakData = loadJson("streak.json", { dailyStreak: 0 });
let dailyStreak = dailyStreakData.dailyStreak || 0;

// ECONOMY PERSISTENCE
let economyData = loadJson("economy.json", {
  users: {}         // userId: { wallet, bank }
});

let cooldowns = {};
let pendingFamily = {};
let misuseCounts = {};
let statusConfig = {
  channelId: null,
  messageId: null,
  operational: "",
  error: "",
  shutdown: "",
  image: null
};

let blackjackGames = {};

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

if (!process.env.TOKEN) {
  console.error("TOKEN missing.");
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

// ===============================
// CONFIG
// ===============================
const ANNOUNCE_CHANNEL = "1513932745854816356";
const EVENTS_ROLE = "1527338030531084498";
const PERMISSION_ROLE = "1530115234767966340";

const EVENTS_TEXT_CHANNEL = "1527334173982064650";
const ANNOUNCEMENTS_TEXT_CHANNEL = "1513932745854816356";

const DEADCHAT_ROLE = "1530138181490577558";
const DEADCHAT_CHANNEL = "1513932745854816356";
const DEADCHAT_INTERVAL = 5 * 60 * 1000;

const PIC_CHANNEL = "1530313495906750615";

const DAILY_CHANNEL = "1517175386021040138";
const DAILY_ROLE = "1530312898939977841";

const BOT_MASTER = "1193517948401373257";

const LEVEL_CHANNEL = "1517175386021040138";

const CHAT_XP_CHANNEL = "1513932845922385920";

const ROLE_TOP = "1530588478352654407";
const ROLE_2 = "1530588534606528632";
const ROLE_3 = "1530588669956722770";
const ROLE_4 = "1530588839163199540";
const ROLE_5 = "1530589017140236419";
const ROLE_6 = "1530588907509514360";
const ROLE_BASE = "1530590724192473240";

const XP_THRESHOLDS = [
  { role: ROLE_BASE, xp: 0 },
  { role: ROLE_6, xp: 500 },
  { role: ROLE_5, xp: 1000 },
  { role: ROLE_4, xp: 1500 },
  { role: ROLE_3, xp: 2000 },
  { role: ROLE_2, xp: 3000 },
  { role: ROLE_TOP, xp: 10000 }
];

let deadchatEnabled = false;
let botLocked = false;
let roastEnabled = false;

const picSubmitUsers = new Set();

// ===============================
// HELPERS
// ===============================
function getEcoUser(id) {
  if (!economyData.users[id]) {
    economyData.users[id] = { wallet: 0, bank: 0 };
    saveJson("economy.json", economyData);
  }
  return economyData.users[id];
}

function canUse(userId, cmd, ms) {
  const now = Date.now();
  if (!cooldowns[userId]) cooldowns[userId] = {};
  const last = cooldowns[userId][cmd] || 0;
  if (now - last < ms) return false;
  cooldowns[userId][cmd] = now;
  return true;
}

// Blackjack helpers
function bjDrawCard() {
  const values = [2,3,4,5,6,7,8,9,10,11];
  return values[Math.floor(Math.random() * values.length)];
}

function bjHandValue(hand) {
  let sum = hand.reduce((a,b) => a + b, 0);
  let aces = hand.filter(v => v === 11).length;
  while (sum > 21 && aces > 0) {
    sum -= 10;
    aces--;
  }
  return sum;
}

// ===============================
// READY
// ===============================
client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  // XP is NO LONGER wiped — only saved
  saveJson("xpData.json", xpData);

  await client.user.setPresence({
    status: "idle",
    activities: [{ name: "⇢ ˗ˏˋ Olgasm; V0.7 ࿐ྂ", type: 1 }]
  });

  // ===============================
  // SLASH COMMANDS
  // ===============================
  await client.application.commands.set([
    new SlashCommandBuilder()
      .setName("announcement")
      .setDescription("create announcement (modal)"),

    new SlashCommandBuilder()
      .setName("deadchat")
      .setDescription("toggle deadchat")
      .addStringOption(o =>
        o.setName("mode")
          .setDescription("on/off")
          .addChoices({ name: "on", value: "on" }, { name: "off", value: "off" })
          .setRequired(true)
      ),

    new SlashCommandBuilder().setName("cmd").setDescription("show all commands"),

    new SlashCommandBuilder()
      .setName("deratization")
      .setDescription("lock/unlock channel")
      .addSubcommand(s => s.setName("start").setDescription("lock"))
      .addSubcommand(s => s.setName("end").setDescription("unlock")),

    new SlashCommandBuilder()
      .setName("pic")
      .setDescription("pic suggestion")
      .addSubcommand(s => s.setName("submit").setDescription("submit a pic")),

    new SlashCommandBuilder()
      .setName("statuschannel")
      .setDescription("configure status system")
      .addSubcommand(s =>
        s.setName("set")
          .setDescription("set status channel")
          .addAttachmentOption(o => o.setName("image").setDescription("optional image"))
      ),

    new SlashCommandBuilder().setName("shutdown").setDescription("shutdown"),

    new SlashCommandBuilder()
      .setName("bot")
      .setDescription("lock/unlock bot")
      .addSubcommand(s => s.setName("lock").setDescription("lock bot"))
      .addSubcommand(s => s.setName("unlock").setDescription("unlock bot")),

    // EMBED COMMANDS
    new SlashCommandBuilder()
      .setName("embed")
      .setDescription("embed tools")
      .addSubcommand(s =>
        s.setName("create")
          .setDescription("create embed")
      )
      .addSubcommand(s =>
        s.setName("edit")
          .setDescription("edit existing embed")
          .addStringOption(o =>
            o.setName("msgid")
              .setDescription("Message ID of the embed")
              .setRequired(true)
          )
      ),

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

    new SlashCommandBuilder()
      .setName("roast")
      .setDescription("toggle roast mode")
      .addStringOption(o =>
        o.setName("mode")
          .setDescription("on/off")
          .addChoices({ name: "on", value: "on" }, { name: "off", value: "off" })
          .setRequired(true)
      ),

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

    new SlashCommandBuilder()
      .setName("leaderboard")
      .setDescription("show leaderboard")
      .addStringOption(o =>
        o.setName("type")
          .setDescription("messages/economy")
          .addChoices(
            { name: "messages", value: "messages" },
            { name: "economy", value: "economy" }
          )
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
      ),

    new SlashCommandBuilder().setName("work").setDescription("work for turds"),
    new SlashCommandBuilder().setName("crime").setDescription("commit crime for turds"),
    new SlashCommandBuilder().setName("slut").setDescription("be a slut for turds"),
    new SlashCommandBuilder().setName("blackjack").setDescription("play blackjack for turds"),

    new SlashCommandBuilder()
      .setName("rob")
      .setDescription("rob a bitch")
      .addUserOption(o => o.setName("user").setDescription("target").setRequired(true)),

    new SlashCommandBuilder()
      .setName("cash")
      .setDescription("show your cash"),

    new SlashCommandBuilder()
      .setName("roll")
      .setDescription("roll your money")
      .addIntegerOption(o =>
        o.setName("amount").setDescription("amount to roll").setRequired(true)
      ),

    new SlashCommandBuilder()
      .setName("purge")
      .setDescription("purge messages")
      .addIntegerOption(o =>
        o.setName("amount").setDescription("amount (1-100)").setRequired(true)
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

          if (oldMember && oldMember.roles.cache.has(ROLE_TOP)) {
            await oldMember.roles.remove(ROLE_TOP).catch(() => {});
          }
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
        const channel = guild.channels.cache.get(CHAT_XP_CHANNEL);
        if (!channel) continue;

        const randomRoast = [
          "go work out, bitch.",
          "go lose some weight, bitch.",
          "you look like a walking donut, go gym.",
          "cardio, bitch. now.",
          "your body screams help, go lift."
        ][Math.floor(Math.random() * 5)];

        const embed = new EmbedBuilder()
          .setColor("#ED0000")
          .setDescription(`<@${target.id}> ${randomRoast}`)
          .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." });

        await channel.send({ content: `<@${target.id}>`, embeds: [embed] });
      }
    } catch (e) {
      console.error("Roast loop error:", e);
    }
  }, 5 * 60 * 1000);

  // FAMILY CONFIRMATION TIMEOUT
  setInterval(async () => {
    const now = Date.now();
    for (const key in pendingFamily) {
      const pf = pendingFamily[key];
      if (pf.expiresAt <= now) {
        try {
          const guild = client.guilds.cache.get(pf.guildId);
          if (!guild) {
            delete pendingFamily[key];
            continue;
          }
          const channel = guild.channels.cache.get(pf.channelId);
          if (!channel) {
            delete pendingFamily[key];
            continue;
          }
          const msg = await channel.messages.fetch(pf.msgId).catch(() => null);
          if (!msg) {
            delete pendingFamily[key];
            continue;
          }
          const embed = new EmbedBuilder()
            .setColor("#ED0000")
            .setDescription("you ran out of time, bitch.")
            .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." });
          await msg.reply({ embeds: [embed] });
        } catch {}
        delete pendingFamily[key];
      }
    }
  }, 30 * 1000);
});

// ===============================
// INTERACTIONS
// ===============================
client.on("interactionCreate", async (interaction) => {
  try {
    if (botLocked && interaction.user.id !== BOT_MASTER) {
      return interaction.reply({
        ephemeral: true,
        content: "bot is locked, bitch."
      });
    }

    // ROLE MENTION FIXER
    function fixRoleMentions(text, guild) {
      if (!text) return text;
      return text.replace(/<@&(\d+)>/g, (match, id) => {
        const role = guild.roles.cache.get(id);
        return role ? `<@&${id}>` : match;
      });
    }

    // EMBED CREATE — MODAL SUBMIT
    if (interaction.isModalSubmit() && interaction.customId === "embed_modal") {
      const title = interaction.fields.getTextInputValue("embed_title");
      const desc = interaction.fields.getTextInputValue("embed_desc");
      const image = interaction.fields.getTextInputValue("embed_image");
      const footer = interaction.fields.getTextInputValue("embed_footer");

      const guild = interaction.guild;

      const embed = new EmbedBuilder()
        .setColor("#ED0000")
        .setDescription(fixRoleMentions(desc, guild))
        .setFooter({
          text: footer
            ? fixRoleMentions(footer, guild)
            : ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·."
        });

      if (title) embed.setTitle(fixRoleMentions(title, guild));
      if (image) embed.setImage(image);

      await interaction.channel.send({ embeds: [embed] });

      return interaction.reply({
        ephemeral: true,
        content: "embed sent, bitch."
      });
    }

    // EMBED EDIT — MODAL SUBMIT
    if (interaction.isModalSubmit() && interaction.customId.startsWith("embed_edit_")) {
      const msgId = interaction.customId.split("_")[2];
      const guild = interaction.guild;

      const newTitle = interaction.fields.getTextInputValue("embed_title");
      const newDesc = interaction.fields.getTextInputValue("embed_desc");
      const newImage = interaction.fields.getTextInputValue("embed_image");
      const newFooter = interaction.fields.getTextInputValue("embed_footer");

      const msg = await interaction.channel.messages.fetch(msgId).catch(() => null);
      if (!msg) {
        return interaction.reply({ ephemeral: true, content: "message is dead, bitch." });
      }

      if (!msg.author || msg.author.id !== client.user.id) {
        return interaction.reply({ ephemeral: true, content: "this ain't my embed, bitch." });
      }

      if (!msg.embeds || msg.embeds.length !== 1) {
        return interaction.reply({ ephemeral: true, content: "embed is weird, bitch." });
      }

      const old = msg.embeds[0];

      const embed = new EmbedBuilder()
        .setColor(old.color || "#ED0000")
        .setTitle(newTitle ? fixRoleMentions(newTitle, guild) : old.title)
        .setDescription(newDesc ? fixRoleMentions(newDesc, guild) : old.description)
        .setFooter({
          text: newFooter
            ? fixRoleMentions(newFooter, guild)
            : (old.footer?.text || ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·.")
        });

      if (newImage) embed.setImage(newImage);
      else if (old.image) embed.setImage(old.image.url);

      await msg.edit({ embeds: [embed] });

      return interaction.reply({ ephemeral: true, content: "embed edited, bitch." });
    }

    // BUTTONS
    if (interaction.isButton()) {
      const id = interaction.customId;

      // warn hate button
      if (id.startsWith("warn_hate_")) {
        return interaction.reply({
          ephemeral: true,
          content: "yeah bitch, this was sent with pure hate."
        });
      }

      // family confirm buttons
      if (id.startsWith("family_")) {
        const parts = id.split("_");
        const type = parts[1];
        const decision = parts[2];
        const key = parts.slice(3).join("_");

        const pf = pendingFamily[key];
        if (!pf) {
          return interaction.reply({
            ephemeral: true,
            content: "this confirmation is dead, bitch."
          });
        }

        if (type === "marry" || type === "adopt") {
          if (interaction.user.id !== pf.b) {
            return interaction.reply({
              ephemeral: true,
              content: "this ain't your confirmation, bitch."
            });
          }
        } else if (type === "divorce" || type === "abandon") {
          if (interaction.user.id !== pf.a) {
            return interaction.reply({
              ephemeral: true,
              content: "this ain't your confirmation, bitch."
            });
          }
        }

        if (decision === "no") {
          const embed = new EmbedBuilder()
            .setColor("#ED0000")
            .setDescription("they said no, bitch.")
            .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." });
          delete pendingFamily[key];
          return interaction.update({ embeds: [embed], components: [] });
        }

        if (type === "marry") {
          familyData.marriages.push({ a: pf.a, b: pf.b });
        } else if (type === "adopt") {
          familyData.parents.push({ parent: pf.a, child: pf.b });
        } else if (type === "divorce") {
          familyData.marriages = familyData.marriages.filter(
            m =>
              !(
                (m.a === pf.a && m.b === pf.b) ||
                (m.a === pf.b && m.b === pf.a)
              )
          );
        } else if (type === "abandon") {
          familyData.parents = familyData.parents.filter(
            p => !(p.parent === pf.a && p.child === pf.b)
          );
        }
        saveJson("family.json", familyData);

        const embed = new EmbedBuilder()
          .setColor("#ED0000")
          .setDescription("confirmed, bitch.")
          .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." });

        delete pendingFamily[key];
        return interaction.update({ embeds: [embed], components: [] });
      }

      // CASH buttons
      if (id.startsWith("cash_withdraw_")) {
        const targetId = id.split("_")[2];
        if (targetId !== interaction.user.id) {
          return interaction.reply({ ephemeral: true, content: "this ain't your cash, bitch." });
        }

        const modal = new ModalBuilder()
          .setCustomId("cash_withdraw_modal")
          .setTitle("Withdraw turds");

        const input = new TextInputBuilder()
          .setCustomId("amount")
          .setLabel("Amount to withdraw")
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        const row = new ActionRowBuilder().addComponents(input);
        modal.addComponents(row);

        return interaction.showModal(modal);
      }

      if (id.startsWith("cash_deposit_")) {
        const targetId = id.split("_")[2];
        if (targetId !== interaction.user.id) {
          return interaction.reply({ ephemeral: true, content: "this ain't your cash, bitch." });
        }

        const modal = new ModalBuilder()
          .setCustomId("cash_deposit_modal")
          .setTitle("Deposit turds");

        const input = new TextInputBuilder()
          .setCustomId("amount")
          .setLabel("Amount to deposit")
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        const row = new ActionRowBuilder().addComponents(input);
        modal.addComponents(row);

        return interaction.showModal(modal);
      }

      // BLACKJACK buttons
      if (id.startsWith("bj_")) {
        const parts = id.split("_");
        const action = parts[1];
        const uid = parts[2];

        if (uid !== interaction.user.id) {
          return interaction.reply({ ephemeral: true, content: "this ain't your game, bitch." });
        }

        const game = blackjackGames[uid];
        if (!game || game.finished) {
          return interaction.reply({ ephemeral: true, content: "game is over, bitch." });
        }

        game.moves = (game.moves || 0) + 1;
        if (game.moves > 10) {
          game.finished = true;
        }

        const eco = getEcoUser(uid);

        if (action === "hit" && !game.finished) {
          game.playerHand.push(bjDrawCard());
          const playerVal = bjHandValue(game.playerHand);
          const dealerVal = bjHandValue(game.dealerHand);

          let desc = `**Bet:** ${game.bet} turds\n\n` +
                     `**Your hand:** ${game.playerHand.join(", ")} (value: ${playerVal})\n` +
                     `**Dealer hand:** ${game.dealerHand.join(", ")} (value: ${dealerVal})\n\n`;

          if (playerVal > 21) {
            game.finished = true;
            eco.wallet -= game.bet;
            saveJson("economy.json", economyData);
            desc += `you busted, bitch. -${game.bet} turds.`;
          } else {
            desc += "hit again or stand, bitch.";
          }

          const embed = new EmbedBuilder()
            .setColor("#ED0000")
            .setTitle("Blackjack")
            .setDescription(desc)
            .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." });

          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`bj_hit_${uid}`)
              .setLabel("Hit")
              .setStyle(ButtonStyle.Primary)
              .setDisabled(game.finished),
            new ButtonBuilder()
              .setCustomId(`bj_stand_${uid}`)
              .setLabel("Stand")
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(game.finished)
          );

          return interaction.update({ embeds: [embed], components: game.finished ? [] : [row] });
        }

        if (action === "stand" || game.finished) {
          game.finished = true;

          let playerVal = bjHandValue(game.playerHand);
          let dealerVal = bjHandValue(game.dealerHand);

          while (dealerVal < 17) {
            game.dealerHand.push(bjDrawCard());
            dealerVal = bjHandValue(game.dealerHand);
          }

          let result;
          let delta = 0;

          if (playerVal > 21) {
            result = "you busted, bitch.";
            delta = -game.bet;
          } else if (dealerVal > 21 || playerVal > dealerVal) {
            result = "you actually won, bitch.";
            delta = game.bet;
          } else if (playerVal < dealerVal) {
            result = "dealer clapped you, bitch.";
            delta = -game.bet;
          } else {
            result = "it's a tie, boring bitch.";
            delta = 0;
          }

          eco.wallet += delta;
          saveJson("economy.json", economyData);

          const embed = new EmbedBuilder()
            .setColor("#ED0000")
            .setTitle("Blackjack – Final")
            .setDescription(
              `**Bet:** ${game.bet} turds\n\n` +
              `**Your hand:** ${game.playerHand.join(", ")} (value: ${playerVal})\n` +
              `**Dealer hand:** ${game.dealerHand.join(", ")} (value: ${dealerVal})\n\n` +
              `${result}\n` +
              `Balance change: **${delta}** turds\n` +
              `New wallet: **${eco.wallet}**`
            )
            .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." });

          delete blackjackGames[uid];

          return interaction.update({ embeds: [embed], components: [] });
        }
      }

      return;
    }

    // OTHER MODALS (announcement, cash)
    if (interaction.isModalSubmit()) {
      const id = interaction.customId;

      if (id === "announcement_modal") {
        const title = interaction.fields.getTextInputValue("title");
        const body = interaction.fields.getTextInputValue("body");
        const type = interaction.fields.getTextInputValue("type");

        let channelId = null;
        if (type.toLowerCase() === "events") channelId = EVENTS_TEXT_CHANNEL;
        else if (type.toLowerCase() === "announcements") channelId = ANNOUNCEMENTS_TEXT_CHANNEL;

        if (!channelId) {
          return interaction.reply({
            ephemeral: true,
            content: "learn how to type, bitch. use 'events' or 'announcements'."
          });
        }

        const channel = await client.channels.fetch(channelId).catch(() => null);
        if (!channel) {
          return interaction.reply({
            ephemeral: true,
            content: "channel is dead, bitch."
          });
        }

        const embed = new EmbedBuilder()
          .setColor("#ED0000")
          .setTitle(title)
          .setDescription(body)
          .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." });

        await channel.send({ embeds: [embed] });
        return interaction.reply({ ephemeral: true, content: "announcement sent, bitch." });
      }

      if (id === "cash_withdraw_modal") {
        const amount = parseInt(interaction.fields.getTextInputValue("amount"));
        const eco = getEcoUser(interaction.user.id);

        if (isNaN(amount) || amount <= 0) {
          return interaction.reply({ ephemeral: true, content: "invalid amount, bitch." });
        }

        if (eco.bank < amount) {
          return interaction.reply({ ephemeral: true, content: "you broke, bitch." });
        }

        eco.bank -= amount;
        eco.wallet += amount;
        saveJson("economy.json", economyData);

        return interaction.reply({ ephemeral: true, content: `withdrew ${amount} turds, bitch.` });
      }

      if (id === "cash_deposit_modal") {
        const amount = parseInt(interaction.fields.getTextInputValue("amount"));
        const eco = getEcoUser(interaction.user.id);

        if (isNaN(amount) || amount <= 0) {
          return interaction.reply({ ephemeral: true, content: "invalid amount, bitch." });
        }

        if (eco.wallet < amount) {
          return interaction.reply({ ephemeral: true, content: "you broke, bitch." });
        }

        eco.wallet -= amount;
        eco.bank += amount;
        saveJson("economy.json", economyData);

        return interaction.reply({ ephemeral: true, content: `deposited ${amount} turds, bitch.` });
      }
    }

    // SLASH COMMANDS HANDLING
    if (interaction.isChatInputCommand()) {
      const { commandName } = interaction;

      // EMBED COMMANDS
      if (commandName === "embed") {
        const sub = interaction.options.getSubcommand();

        if (sub === "create") {
          const modal = new ModalBuilder()
            .setCustomId("embed_modal")
            .setTitle("Custom Embed Creator");

          const titleInput = new TextInputBuilder()
            .setCustomId("embed_title")
            .setLabel("Title (optional)")
            .setStyle(TextInputStyle.Short)
            .setRequired(false);

          const descInput = new TextInputBuilder()
            .setCustomId("embed_desc")
            .setLabel("Description")
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);

          const imageInput = new TextInputBuilder()
            .setCustomId("embed_image")
            .setLabel("Image URL (optional)")
            .setStyle(TextInputStyle.Short)
            .setRequired(false);

          const footerInput = new TextInputBuilder()
            .setCustomId("embed_footer")
            .setLabel("Footer (optional)")
            .setStyle(TextInputStyle.Short)
            .setRequired(false);

          modal.addComponents(
            new ActionRowBuilder().addComponents(titleInput),
            new ActionRowBuilder().addComponents(descInput),
            new ActionRowBuilder().addComponents(imageInput),
            new ActionRowBuilder().addComponents(footerInput)
          );

          return interaction.showModal(modal);
        }

        if (sub === "edit") {
          const msgId = interaction.options.getString("msgid");

          const msg = await interaction.channel.messages.fetch(msgId).catch(() => null);
          if (!msg) {
            return interaction.reply({ ephemeral: true, content: "message is dead, bitch." });
          }

          if (!msg.author || msg.author.id !== client.user.id) {
            return interaction.reply({ ephemeral: true, content: "this ain't my embed, bitch." });
          }

          if (!msg.embeds || msg.embeds.length !== 1) {
            return interaction.reply({ ephemeral: true, content: "embed is weird, bitch." });
          }

          const modal = new ModalBuilder()
            .setCustomId(`embed_edit_${msgId}`)
            .setTitle("Edit Embed");

          const titleInput = new TextInputBuilder()
            .setCustomId("embed_title")
            .setLabel("New Title (optional)")
            .setStyle(TextInputStyle.Short)
            .setRequired(false);

          const descInput = new TextInputBuilder()
            .setCustomId("embed_desc")
            .setLabel("New Description (optional)")
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(false);

          const imageInput = new TextInputBuilder()
            .setCustomId("embed_image")
            .setLabel("New Image URL (optional)")
            .setStyle(TextInputStyle.Short)
            .setRequired(false);

          const footerInput = new TextInputBuilder()
            .setCustomId("embed_footer")
            .setLabel("New Footer (optional)")
            .setStyle(TextInputStyle.Short)
            .setRequired(false);

          modal.addComponents(
            new ActionRowBuilder().addComponents(titleInput),
            new ActionRowBuilder().addComponents(descInput),
            new ActionRowBuilder().addComponents(imageInput),
            new ActionRowBuilder().addComponents(footerInput)
          );

          return interaction.showModal(modal);
        }
      }

      // ... your other slash commands (kick, ban, warn, economy, etc.) here ...
    }

  } catch (err) {
    console.error("Interaction error:", err);
  }
});

// ===============================
// MESSAGE CREATE
// ===============================
client.on("messageCreate", async (msg) => {
  if (msg.author.bot) return;

  // your XP system, economy, roast triggers, etc.
});

// ===============================
// SHUTDOWN
// ===============================
process.on("SIGINT", () => {
  console.log("Shutting down...");
  process.exit(0);
});

client.login(process.env.TOKEN);
