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

let cooldowns = {};        // { userId: { cmdName: timestamp } }
let pendingFamily = {};    // customId -> { type, a, b, msgId, guildId, channelId, expiresAt }
let misuseCounts = {};     // userId: count (XP channel misuse)
let statusConfig = {
  channelId: null,
  messageId: null,
  operational: "",
  error: "",
  shutdown: "",
  image: null
};

let blackjackGames = {};   // userId -> { bet, playerHand, dealerHand, moves, finished }

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

// XP ONLY IN THIS CHANNEL
const CHAT_XP_CHANNEL = "1513932845922385920";

const ROLE_TOP = "1530588478352654407";
const ROLE_2 = "1530588534606528632";
const ROLE_3 = "1530588669956722770";
const ROLE_4 = "1530588839163199540";
const ROLE_5 = "1530589017140236419";
const ROLE_6 = "1530588907509514360";
const ROLE_BASE = "1530590724192473240";

// XP thresholds
const XP_THRESHOLDS = [
  { role: ROLE_BASE, xp: 0 },
  { role: ROLE_6, xp: 500 },
  { role: ROLE_5, xp: 1000 },
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
// ECONOMY HELPERS
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

// BLACKJACK HELPERS
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

  // wipe XP všech uživatelů při startu
  xpData.users = {};
  xpData.bestUserId = null;
  xpData.bestSince = null;
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

    new SlashCommandBuilder()
      .setName("embed")
      .setDescription("create embed")
      .addSubcommand(s => s.setName("create").setDescription("create embed")),

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

  // ROAST LOOP – do XP kanálu
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

  // FAMILY CONFIRMATION TIMEOUT CHECK
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
        const parts = id.split("_"); // family_type_yes/no_key
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

        // kdo smí potvrzovat
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

      // BLACKJACK buttons – only executor
      if (id.startsWith("bj_")) {
        const parts = id.split("_"); // bj_action_userid
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

    // MODALS
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

      if (id === "embed_create_modal") {
        const title = interaction.fields.getTextInputValue("title");
        const desc = interaction.fields.getTextInputValue("description");

        const embed = new EmbedBuilder()
          .setColor("#ED0000")
          .setTitle(title)
          .setDescription(desc)
          .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." });

        return interaction.reply({ embeds: [embed] });
      }

      if (id === "cash_withdraw_modal") {
        const amountStr = interaction.fields.getTextInputValue("amount");
        const amount = parseInt(amountStr, 10);
        if (isNaN(amount) || amount <= 0) {
          return interaction.reply({ ephemeral: true, content: "learn numbers, bitch." });
        }

        const eco = getEcoUser(interaction.user.id);
        eco.bank -= amount;
        eco.wallet += amount;
        saveJson("economy.json", economyData);

        const embed = new EmbedBuilder()
          .setColor("#ED0000")
          .setDescription(
            `you withdrew **${amount}** turds.\n` +
            `**Wallet:** ${eco.wallet} | **Bank:** ${eco.bank}`
          )
          .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." });

        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      if (id === "cash_deposit_modal") {
        const amountStr = interaction.fields.getTextInputValue("amount");
        const amount = parseInt(amountStr, 10);
        if (isNaN(amount) || amount <= 0) {
          return interaction.reply({ ephemeral: true, content: "learn numbers, bitch." });
        }

        const eco = getEcoUser(interaction.user.id);
        eco.wallet -= amount;
        eco.bank += amount;
        saveJson("economy.json", economyData);

        const embed = new EmbedBuilder()
          .setColor("#ED0000")
          .setDescription(
            `you deposited **${amount}** turds.\n` +
            `**Wallet:** ${eco.wallet} | **Bank:** ${eco.bank}`
          )
          .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." });

        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      return;
    }

    // SLASH COMMANDS
    if (!interaction.isChatInputCommand()) return;

    const cmd = interaction.commandName;
    const user = interaction.user;
    const member = interaction.member;

    if (cmd === "announcement") {
      const modal = new ModalBuilder()
        .setCustomId("announcement_modal")
        .setTitle("Create announcement");

      const title = new TextInputBuilder()
        .setCustomId("title")
        .setLabel("Title")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const body = new TextInputBuilder()
        .setCustomId("body")
        .setLabel("Body")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      const type = new TextInputBuilder()
        .setCustomId("type")
        .setLabel("Type (events/announcements)")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder().addComponents(title),
        new ActionRowBuilder().addComponents(body),
        new ActionRowBuilder().addComponents(type)
      );

      return interaction.showModal(modal);
    }

    if (cmd === "deadchat") {
      const mode = interaction.options.getString("mode", true);
      deadchatEnabled = mode === "on";
      return interaction.reply({
        ephemeral: true,
        content: `deadchat is now ${deadchatEnabled ? "on" : "off"}, bitch.`
      });
    }

    if (cmd === "cmd") {
      const embed = new EmbedBuilder()
        .setColor("#ED0000")
        .setTitle("Commands, bitch")
        .setDescription(
          "/announcement, /deadchat, /deratization, /pic submit, /statuschannel set, /shutdown, /bot lock/unlock,\n" +
          "/embed create, /rolescreate, /kick, /ban, /warn, /warnlogs, /ground, /unground,\n" +
          "/roast, /marry, /divorce, /adopt, /abandon, /familytree,\n" +
          "/leaderboard, /stats, /xp delete,\n" +
          "/work, /crime, /slut, /blackjack, /rob, /cash, /roll,\n" +
          "/purge"
        )
        .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." });
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (cmd === "deratization") {
      const sub = interaction.options.getSubcommand();
      const channel = interaction.channel;

      if (!member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
        return interaction.reply({ ephemeral: true, content: "no perms, bitch." });
      }

      if (sub === "start") {
        await channel.permissionOverwrites.edit(channel.guild.roles.everyone, {
          SendMessages: false
        });
        return interaction.reply({ content: "channel locked, bitch." });
      } else {
        await channel.permissionOverwrites.edit(channel.guild.roles.everyone, {
          SendMessages: null
        });
        return interaction.reply({ content: "channel unlocked, bitch." });
      }
    }

    if (cmd === "pic") {
      const sub = interaction.options.getSubcommand();
      if (sub === "submit") {
        picSubmitUsers.add(user.id);
        return interaction.reply({
          ephemeral: true,
          content: "send your pic in DM, bitch."
        });
      }
    }

    if (cmd === "statuschannel") {
      const sub = interaction.options.getSubcommand();
      if (sub === "set") {
        const attachment = interaction.options.getAttachment("image");
        statusConfig.channelId = interaction.channel.id;
        statusConfig.image = attachment ? attachment.url : null;
        statusConfig.operational = "Bot operational, bitch.";
        statusConfig.error = "Bot error, bitch.";
        statusConfig.shutdown = "Bot shutting down, bitch.";
        saveJson("status.json", statusConfig);

        const embed = new EmbedBuilder()
          .setColor("#ED0000")
          .setDescription("status channel set, bitch.")
          .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." });

        const msg = await interaction.reply({ embeds: [embed], fetchReply: true });
        statusConfig.messageId = msg.id;
        saveJson("status.json", statusConfig);
        return;
      }
    }

    if (cmd === "shutdown") {
      if (user.id !== BOT_MASTER) {
        return interaction.reply({ ephemeral: true, content: "no perms, bitch." });
      }
      const embed = new EmbedBuilder()
        .setColor("#ED0000")
        .setDescription("shutting down, bitch.")
        .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." });
      await interaction.reply({ embeds: [embed] });
      process.exit(0);
    }

    if (cmd === "bot") {
      const sub = interaction.options.getSubcommand();
      if (user.id !== BOT_MASTER) {
        return interaction.reply({ ephemeral: true, content: "no perms, bitch." });
      }
      botLocked = sub === "lock";
      return interaction.reply({
        ephemeral: true,
        content: `bot is now ${botLocked ? "locked" : "unlocked"}, bitch.`
      });
    }

    if (cmd === "embed") {
      const sub = interaction.options.getSubcommand();
      if (sub === "create") {
        const modal = new ModalBuilder()
          .setCustomId("embed_create_modal")
          .setTitle("Create embed");

        const title = new TextInputBuilder()
          .setCustomId("title")
          .setLabel("Title")
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        const desc = new TextInputBuilder()
          .setCustomId("description")
          .setLabel("Description")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true);

        modal.addComponents(
          new ActionRowBuilder().addComponents(title),
          new ActionRowBuilder().addComponents(desc)
        );

        return interaction.showModal(modal);
      }
    }

    if (cmd === "rolescreate") {
      const msgId = interaction.options.getString("msgid", true);
      const emojisStr = interaction.options.getString("emojis", true);
      const role1 = interaction.options.getRole("role1", true);
      const role2 = interaction.options.getRole("role2");
      const role3 = interaction.options.getRole("role3");

      const emojis = emojisStr.split(",").map(e => e.trim()).filter(Boolean);
      const roles = [role1, role2, role3].filter(Boolean);

      if (emojis.length < roles.length) {
        return interaction.reply({
          ephemeral: true,
          content: "more roles than emojis, bitch."
        });
      }

      const msg = await interaction.channel.messages.fetch(msgId).catch(() => null);
      if (!msg) {
        return interaction.reply({
          ephemeral: true,
          content: "message not found, bitch."
        });
      }

      for (let i = 0; i < roles.length; i++) {
        await msg.react(emojis[i]).catch(() => {});
      }

      let rrData = loadJson("reactionroles.json", {});
      rrData[msgId] = {
        emojis: emojis.slice(0, roles.length),
        roles: roles.map(r => r.id)
      };
      saveJson("reactionroles.json", rrData);

      return interaction.reply({
        ephemeral: true,
        content: "reaction roles set, bitch."
      });
    }

    if (cmd === "kick") {
      const target = interaction.options.getUser("user", true);
      const reason = interaction.options.getString("reason") || "no reason, bitch.";
      const m = await interaction.guild.members.fetch(target.id).catch(() => null);
      if (!m) return interaction.reply({ ephemeral: true, content: "no such bitch." });

      await m.kick(reason).catch(() => {});
      const embed = new EmbedBuilder()
        .setColor("#ED0000")
        .setDescription(`kicked <@${target.id}> for: ${reason}`)
        .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." });
      return interaction.reply({ embeds: [embed] });
    }

    if (cmd === "ban") {
      const target = interaction.options.getUser("user", true);
      const reason = interaction.options.getString("reason") || "no reason, bitch.";
      const m = await interaction.guild.members.fetch(target.id).catch(() => null);
      if (!m) return interaction.reply({ ephemeral: true, content: "no such bitch." });

      await m.ban({ reason }).catch(() => {});
      const embed = new EmbedBuilder()
        .setColor("#ED0000")
        .setDescription(`banned <@${target.id}> for: ${reason}`)
        .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." });
      return interaction.reply({ embeds: [embed] });
    }

    if (cmd === "warn") {
      const target = interaction.options.getUser("user", true);
      const reason = interaction.options.getString("reason", true);

      if (!warnsData.users[target.id]) warnsData.users[target.id] = [];
      warnsData.users[target.id].push({
        moderatorId: user.id,
        reason,
        timestamp: Date.now()
      });
      saveJson("warns.json", warnsData);

      const modMember = interaction.guild.members.cache.get(user.id);
      const modName = modMember ? (modMember.nickname || modMember.user.username) : user.username;

      const embed = new EmbedBuilder()
        .setColor("#ED0000")
        .setDescription(
          `-points disgustingly- <@${target.id}> you got warned, bitch.\n\n` +
          `**Reason:** ${reason}`
        )
        .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`warn_hate_${target.id}_${Date.now()}`)
          .setLabel(`Sent with hate from: ${modName}`)
          .setStyle(ButtonStyle.Danger)
      );

      await interaction.reply({
        content: `<@${target.id}>`,
        embeds: [embed],
        components: [row]
      });

      try {
        const dmEmbed = new EmbedBuilder()
          .setColor("#ED0000")
          .setDescription(
            `you got warned, bitch.\n\n**Reason:** ${reason}`
          )
          .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." });

        const u = await client.users.fetch(target.id);
        await u.send({ embeds: [dmEmbed] }).catch(() => {});
      } catch {}

      return;
    }

    if (cmd === "warnlogs") {
      const target = interaction.options.getUser("user", true);
      const logs = warnsData.users[target.id] || [];
      if (logs.length === 0) {
        return interaction.reply({
          ephemeral: true,
          content: "no warns, bitch."
        });
      }

      let desc = "";
      logs.forEach((w, i) => {
        const date = new Date(w.timestamp).toLocaleString();
        desc += `**${i + 1}.** ${w.reason} (by <@${w.moderatorId}> at ${date})\n`;
      });

      const embed = new EmbedBuilder()
        .setColor("#ED0000")
        .setTitle(`Warn logs for ${target.tag}`)
        .setDescription(desc)
        .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." });

      return interaction.reply({ embeds: [embed] });
    }

    if (cmd === "ground") {
      const target = interaction.options.getUser("user", true);
      const duration = interaction.options.getInteger("duration", true);
      const reason = interaction.options.getString("reason", true);

      const until = Date.now() + duration * 60 * 1000;
      groundData.users[target.id] = { until, reason };
      saveJson("ground.json", groundData);

      const embed = new EmbedBuilder()
        .setColor("#ED0000")
        .setDescription(
          `grounded <@${target.id}> for **${duration}** minutes.\nReason: ${reason}`
        )
        .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." });

      await interaction.reply({ embeds: [embed] });

      try {
        const dmEmbed = new EmbedBuilder()
          .setColor("#ED0000")
          .setDescription(
            `you've been grounded for **${duration}** minutes due to **${reason}** , start behaving, bitch!`
          )
          .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." });
        const u = await client.users.fetch(target.id);
        await u.send({ embeds: [dmEmbed] }).catch(() => {});
      } catch {}

      return;
    }

    if (cmd === "unground") {
      const target = interaction.options.getUser("user", true);
      delete groundData.users[target.id];
      saveJson("ground.json", groundData);

      const embed = new EmbedBuilder()
        .setColor("#ED0000")
        .setDescription(`ungrounded <@${target.id}>`)
        .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." });

      return interaction.reply({ embeds: [embed] });
    }

    if (cmd === "roast") {
      const mode = interaction.options.getString("mode", true);
      roastEnabled = mode === "on";
      return interaction.reply({
        ephemeral: true,
        content: `roast is now ${roastEnabled ? "on" : "off"}, bitch.`
      });
    }

    if (cmd === "marry" || cmd === "adopt" || cmd === "divorce" || cmd === "abandon") {
      const target = interaction.options.getUser("user", true);

      const key = `${cmd}_${user.id}_${target.id}_${Date.now()}`;
      pendingFamily[key] = {
        type: cmd,
        a: user.id,
        b: target.id,
        guildId: interaction.guild.id,
        channelId: interaction.channel.id,
        msgId: null,
        expiresAt: Date.now() + 2 * 60 * 1000
      };

      const embed = new EmbedBuilder()
        .setColor("#ED0000")
        .setDescription(
          cmd === "marry"
            ? `marriage request: <@${user.id}> wants to marry <@${target.id}>`
            : cmd === "adopt"
            ? `<@${user.id}> wants to adopt <@${target.id}>`
            : cmd === "divorce"
            ? `<@${user.id}> wants to divorce <@${target.id}>`
            : `<@${user.id}> wants to abandon <@${target.id}>`
        )
        .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`family_${cmd}_yes_${key}`)
          .setLabel("Yes")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`family_${cmd}_no_${key}`)
          .setLabel("No")
          .setStyle(ButtonStyle.Danger)
      );

      const msg = await interaction.reply({
        content: cmd === "divorce" ? `<@${user.id}>` : `<@${user.id}> <@${target.id}>`,
        embeds: [embed],
        components: [row],
        fetchReply: true
      });

      pendingFamily[key].msgId = msg.id;
      return;
    }

    if (cmd === "familytree") {
      const uid = user.id;
      const marriages = familyData.marriages.filter(m => m.a === uid || m.b === uid);
      const parents = familyData.parents.filter(p => p.parent === uid || p.child === uid);

      let desc = "";
      if (marriages.length === 0 && parents.length === 0) {
        desc = "your family tree is empty, bitch.";
      } else {
        desc += "**Marriages:**\n";
        marriages.forEach(m => {
          const other = m.a === uid ? m.b : m.a;
          desc += `• married to <@${other}>\n`;
        });
        desc += "\n**Parents/Children:**\n";
        parents.forEach(p => {
          if (p.parent === uid) desc += `• parent of <@${p.child}>\n`;
          else desc += `• child of <@${p.parent}>\n`;
        });
      }

      const embed = new EmbedBuilder()
        .setColor("#ED0000")
        .setTitle("Family tree")
        .setDescription(desc)
        .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." });

      return interaction.reply({ embeds: [embed] });
    }

    if (cmd === "leaderboard") {
      const type = interaction.options.getString("type", true);

      if (type === "messages") {
        const entries = Object.entries(xpData.users)
          .sort((a, b) => b[1].messages - a[1].messages)
          .slice(0, 3);

        if (entries.length === 0) {
          return interaction.reply({ ephemeral: true, content: "no data, bitch." });
        }

        let desc = "";
        entries.forEach(([uid, data], i) => {
          const fire = i === 0 ? "🔥 " : "";
          desc += `${fire}**${i + 1}.** <@${uid}> – ${data.messages} messages\n`;
        });

        const embed = new EmbedBuilder()
          .setColor("#ED0000")
          .setTitle("Messages leaderboard")
          .setDescription(desc)
          .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." });

        return interaction.reply({ embeds: [embed] });
      }

      if (type === "economy") {
        const entries = Object.entries(economyData.users)
          .map(([uid, eco]) => ({ uid, total: eco.wallet + eco.bank }))
          .sort((a, b) => b.total - a.total)
          .slice(0, 10);

        if (entries.length === 0) {
          return interaction.reply({ ephemeral: true, content: "no cash data, bitch." });
        }

        let desc = "";
        entries.forEach((e, i) => {
          desc += `**${i + 1}.** <@${e.uid}> – ${e.total} turds\n`;
        });

        const embed = new EmbedBuilder()
          .setColor("#ED0000")
          .setTitle("Economy leaderboard")
          .setDescription(desc)
          .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." });

        return interaction.reply({ embeds: [embed] });
      }
    }

    if (cmd === "stats") {
      const data = xpData.users[user.id] || { xp: 0, messages: 0, levelIndex: 0 };
      const xp = data.xp || 0;
      const msgs = data.messages || 0;

      let next = XP_THRESHOLDS.find(t => t.xp > xp);
      let prev = XP_THRESHOLDS.slice().reverse().find(t => t.xp <= xp);
      if (!prev) prev = XP_THRESHOLDS[0];

      const needed = next ? next.xp - xp : 0;
      const progress = next ? Math.min(100, Math.floor((xp - prev.xp) / (next.xp - prev.xp) * 100)) : 100;

      const greenCount = Math.floor(progress / 20);
      const redCount = 5 - greenCount;
      const bar = "🟢".repeat(greenCount) + "🔴".repeat(redCount);

      const embed = new EmbedBuilder()
        .setColor("#ED0000")
        .setTitle("Your stats, bitch")
        .setThumbnail(user.displayAvatarURL())
        .setDescription(
          `**XP:** ${xp}\n` +
          `**Messages:** ${msgs}\n\n` +
          (next
            ? `Next level: ${bar} ${progress}%\nXP left: ${needed}`
            : `You're at the top, bitch.`)
        )
        .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." });

      return interaction.reply({ embeds: [embed] });
    }

    if (cmd === "xp") {
      const sub = interaction.options.getSubcommand();
      if (sub === "delete") {
        if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) {
          return interaction.reply({ ephemeral: true, content: "no perms, bitch." });
        }
        const target = interaction.options.getUser("user", true);
        delete xpData.users[target.id];
        saveJson("xpData.json", xpData);

        const embed = new EmbedBuilder()
          .setColor("#ED0000")
          .setDescription(`deleted XP for <@${target.id}>`)
          .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." });

        try {
          const dmEmbed = new EmbedBuilder()
            .setColor("#ED0000")
            .setDescription(
              "your XP got wiped, bitch. maybe don't piss off admins next time."
            )
            .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." });
          const u = await client.users.fetch(target.id);
          await u.send({ embeds: [dmEmbed] }).catch(() => {});
        } catch {}

        return interaction.reply({ embeds: [embed] });
      }
    }

    if (cmd === "work") {
      if (!canUse(user.id, "work", 5000)) {
        return interaction.reply({
          ephemeral: true,
          content: "slow down bitch, you just worked."
        });
      }

      const eco = getEcoUser(user.id);

      const workMessages = [
        "you've emptied someone's gastric sleeve for {amount} turds.",
        "you cleaned up someone's emotional damage for {amount} turds.",
        "you babysat a demon child for {amount} turds.",
        "you sold your last braincell for {amount} turds.",
        "you wiped someone's tears for {amount} turds.",
        "you did absolutely nothing and still got {amount} turds.",
        "you screamed at customers for {amount} turds.",
        "you survived a shift with idiots for {amount} turds.",
        "you pretended to care for {amount} turds.",
        "you fixed someone's mess for {amount} turds.",
        "you carried the whole team for {amount} turds.",
        "you gaslit someone for {amount} turds.",
        "you overshared for {amount} turds.",
        "you trauma dumped for {amount} turds.",
        "you rage quit and still got {amount} turds."
      ];

      const amount = Math.floor(Math.random() * (50 - 10 + 1)) + 10;
      eco.wallet += amount;
      saveJson("economy.json", economyData);

      const template = workMessages[Math.floor(Math.random() * workMessages.length)];
      const text = template.replace("{amount}", amount.toString());

      const embed = new EmbedBuilder()
        .setColor("#ED0000")
        .setDescription(`-snorts- ${text}`)
        .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." });

      return interaction.reply({ embeds: [embed] });
    }

    if (cmd === "crime") {
      if (!canUse(user.id, "crime", 60 * 1000)) {
        return interaction.reply({
          ephemeral: true,
          content: "slow down, criminal bitch."
        });
      }

      const eco = getEcoUser(user.id);
      const amount = Math.floor(Math.random() * (1000 - 100 + 1)) + 100;
      const fineChance = 0.2;

      const crimeMessages = [
        "you robbed a clown for {amount} turds.",
        "you hacked someone's fridge for {amount} turds.",
        "you stole emotional support for {amount} turds.",
        "you sold fake therapy for {amount} turds.",
        "you scammed a scammer for {amount} turds.",
        "you robbed a gym bro for {amount} turds.",
        "you stole someone's last braincell for {amount} turds.",
        "you pickpocketed a boomer for {amount} turds.",
        "you robbed a crying influencer for {amount} turds.",
        "you stole someone's Spotify playlist for {amount} turds."
      ];

      const fineMessages = [
        "you got caught flexing your crime and got fined {fine} turds.",
        "you tripped over your own ego and got fined {fine} turds.",
        "you bragged too hard and cops fined you {fine} turds.",
        "you posted your crime on stories and got fined {fine} turds.",
        "you snitched on yourself and got fined {fine} turds."
      ];

      let desc;
      if (Math.random() < fineChance) {
        const fine = Math.floor(Math.random() * (200 - 10 + 1)) + 10;
        eco.wallet -= fine;
        const template = fineMessages[Math.floor(Math.random() * fineMessages.length)];
        desc = template.replace("{fine}", fine.toString());
      } else {
        eco.wallet += amount;
        const template = crimeMessages[Math.floor(Math.random() * crimeMessages.length)];
        desc = template.replace("{amount}", amount.toString());
      }

      saveJson("economy.json", economyData);

      const embed = new EmbedBuilder()
        .setColor("#ED0000")
        .setDescription(desc)
        .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." });

      return interaction.reply({ embeds: [embed] });
    }

    if (cmd === "slut") {
      if (!canUse(user.id, "slut", 2 * 60 * 1000)) {
        return interaction.reply({
          ephemeral: true,
          content: "slow down, slut."
        });
      }

      const eco = getEcoUser(user.id);
      const amount = Math.floor(Math.random() * (5000 - 2000 + 1)) + 2000;
      const fineChance = 0.4;

      const slutMessages = [
        "you flirted your way to {amount} turds.",
        "you sold premium chaos for {amount} turds.",
        "you emotionally destroyed someone for {amount} turds.",
        "you did a toxic speedrun for {amount} turds.",
        "you ghosted three people and earned {amount} turds.",
        "you overshared on main and got {amount} turds.",
        "you broke five hearts for {amount} turds.",
        "you did a situationship marathon for {amount} turds.",
        "you posted thirst traps and earned {amount} turds.",
        "you trauma bonded for {amount} turds."
      ];

      const fineMessages = [
        "you got slapped with a **{fine}** turds fine for being too slutty.",
        "karma charged you **{fine}** turds for your slut behavior.",
        "you got billed **{fine}** turds for emotional damage.",
        "you got fined **{fine}** turds for public sluttiness.",
        "you got taxed **{fine}** turds for toxic energy."
      ];

      let desc;
      if (Math.random() < fineChance) {
        const fine = Math.floor(Math.random() * (600 - 10 + 1)) + 10;
        eco.wallet -= fine;
        const template = fineMessages[Math.floor(Math.random() * fineMessages.length)];
        desc = template.replace("{fine}", fine.toString());
      } else {
        eco.wallet += amount;
        const template = slutMessages[Math.floor(Math.random() * slutMessages.length)];
        desc = template.replace("{amount}", amount.toString());
      }

      saveJson("economy.json", economyData);

      const embed = new EmbedBuilder()
        .setColor("#ED0000")
        .setDescription(desc)
        .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." });

      return interaction.reply({ embeds: [embed] });
    }

    if (cmd === "blackjack") {
      if (!canUse(user.id, "blackjack", 5 * 60 * 1000)) {
        return interaction.reply({
          ephemeral: true,
          content: "slow down, casino rat."
        });
      }

      const eco = getEcoUser(user.id);

      if (eco.wallet <= 0) {
        return interaction.reply({
          ephemeral: true,
          content: "you got 0 withdrawn turds, bitch. withdraw some with /cash first."
        });
      }

      // ask for bet via modal
      const modal = new ModalBuilder()
        .setCustomId(`blackjack_bet_${user.id}`)
        .setTitle("Blackjack bet");

      const input = new TextInputBuilder()
        .setCustomId("bet")
        .setLabel(`Bet amount (max ${eco.wallet})`)
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const row = new ActionRowBuilder().addComponents(input);
      modal.addComponents(row);

      return interaction.showModal(modal);
    }

    if (cmd === "rob") {
      if (!canUse(user.id, "rob", 15 * 60 * 1000)) {
        return interaction.reply({
          ephemeral: true,
          content: "slow down, thief."
        });
      }

      const target = interaction.options.getUser("user", true);
      if (target.id === user.id) {
        return interaction.reply({ ephemeral: true, content: "you can't rob yourself, bitch." });
      }

      const eco = getEcoUser(user.id);
      const targetEco = getEcoUser(target.id);

      const available = targetEco.wallet;
      if (available <= 0) {
        return interaction.reply({
          ephemeral: true,
          content: "they got nothing to steal, bitch."
        });
      }

      const outcome = Math.random();
      let desc;

      if (outcome < 0.3) {
        const fine = Math.floor(Math.random() * 1000);
        eco.wallet -= fine;
        desc = `you got fined **${fine}** turds for trying to rob, bitch.`;
      } else if (outcome < 0.7) {
        const amount = Math.floor(available * 0.3);
        targetEco.wallet -= amount;
        eco.wallet += amount;
        desc = `you stole **${amount}** turds from <@${target.id}>, bitch.`;
      } else {
        const amount = available;
        targetEco.wallet -= amount;
        eco.wallet += amount;
        desc = `you stole **${amount}** turds (everything) from <@${target.id}>, bitch.`;
      }

      saveJson("economy.json", economyData);

      const embed = new EmbedBuilder()
        .setColor("#ED0000")
        .setDescription(desc)
        .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." });

      return interaction.reply({ embeds: [embed] });
    }

    if (cmd === "cash") {
      const eco = getEcoUser(user.id);
      const total = eco.wallet + eco.bank;

      const embed = new EmbedBuilder()
        .setColor("#ED0000")
        .setTitle("Your filthy cash")
        .setDescription(
          `**Wallet:** ${eco.wallet} turds\n` +
          `**Bank:** ${eco.bank} turds\n` +
          `**Total:** ${total} turds`
        )
        .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`cash_withdraw_${user.id}`)
          .setLabel("Withdraw")
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId(`cash_deposit_${user.id}`)
          .setLabel("Deposit")
          .setStyle(ButtonStyle.Success)
      );

      return interaction.reply({ embeds: [embed], components: [row] });
    }

    if (cmd === "roll") {
      const amount = interaction.options.getInteger("amount", true);
      if (amount <= 0) {
        return interaction.reply({ ephemeral: true, content: "use real numbers, bitch." });
      }

      const eco = getEcoUser(user.id);
      if (eco.wallet < amount) {
        return interaction.reply({
          ephemeral: true,
          content: "you don't have that much withdrawn, bitch."
        });
      }

      eco.wallet -= amount;

      const maxGain = amount * 2;
      const gain = Math.floor(Math.random() * (maxGain - amount + 1)) + amount;

      eco.wallet += gain;
      saveJson("economy.json", economyData);

      const embed = new EmbedBuilder()
        .setColor("#ED0000")
        .setDescription(
          `you rolled **${amount}** turds and got **${gain}** back.\n` +
          `Profit: **${gain - amount}** turds, bitch.`
        )
        .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." });

      return interaction.reply({ embeds: [embed] });
    }

    if (cmd === "purge") {
      const amount = interaction.options.getInteger("amount", true);
      if (!member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
        return interaction.reply({ ephemeral: true, content: "no perms, bitch." });
      }
      if (amount < 1 || amount > 100) {
        return interaction.reply({ ephemeral: true, content: "1-100 only, bitch." });
      }
      await interaction.channel.bulkDelete(amount, true).catch(() => {});
      return interaction.reply({ ephemeral: true, content: `purged ${amount} messages, bitch.` });
    }
  } catch (e) {
    console.error("interaction error:", e);
    if (!interaction.replied && !interaction.deferred) {
      interaction.reply({ ephemeral: true, content: "something broke, bitch." }).catch(() => {});
    }
  }
});

// BLACKJACK BET MODAL HANDLER
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isModalSubmit()) return;
  const id = interaction.customId;

  if (id.startsWith("blackjack_bet_")) {
    const uid = id.split("_")[2];
    if (uid !== interaction.user.id) {
      return interaction.reply({ ephemeral: true, content: "this ain't your bet, bitch." });
    }

    const eco = getEcoUser(uid);
    const betStr = interaction.fields.getTextInputValue("bet");
    const bet = parseInt(betStr, 10);

    if (isNaN(bet) || bet <= 0) {
      return interaction.reply({ ephemeral: true, content: "learn numbers, bitch." });
    }
    if (bet > eco.wallet) {
      return interaction.reply({
        ephemeral: true,
        content: "you don't have that much withdrawn, bitch."
      });
    }

    const playerHand = [bjDrawCard(), bjDrawCard()];
    const dealerHand = [bjDrawCard(), bjDrawCard()];

    blackjackGames[uid] = {
      bet,
      playerHand,
      dealerHand,
      moves: 0,
      finished: false
    };

    const playerVal = bjHandValue(playerHand);
    const dealerVal = bjHandValue(dealerHand);

    const embed = new EmbedBuilder()
      .setColor("#ED0000")
      .setTitle("Blackjack")
      .setDescription(
        `**Bet:** ${bet} turds\n\n` +
        `**Your hand:** ${playerHand.join(", ")} (value: ${playerVal})\n` +
        `**Dealer hand:** ${dealerHand.join(", ")} (value: ${dealerVal})\n\n` +
        "hit or stand, bitch. you get up to 10 moves."
      )
      .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`bj_hit_${uid}`)
        .setLabel("Hit")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`bj_stand_${uid}`)
        .setLabel("Stand")
        .setStyle(ButtonStyle.Secondary)
    );

    return interaction.reply({ embeds: [embed], components: [row] });
  }
});
// ===============================
// MESSAGE HANDLING
// ===============================
client.on("messageCreate", async (message) => {
  try {
    if (message.author.bot) return;

    // DM pic submit
    if (message.channel.type === 1) {
      if (picSubmitUsers.has(message.author.id)) {
        const guild = client.guilds.cache.first();
        if (!guild) return;
        const channel = guild.channels.cache.get(PIC_CHANNEL);
        if (!channel) return;

        const embed = new EmbedBuilder()
          .setColor("#ED0000")
          .setDescription(
            `pic suggestion from <@${message.author.id}>:\n${message.content || "(no text)"}`
          )
          .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." });

        await channel.send({ embeds: [embed], files: message.attachments.map(a => a.url) });
        picSubmitUsers.delete(message.author.id);
        return;
      }
      return;
    }

    const guild = message.guild;
    if (!guild) return;

    // GROUND CHECK
    const g = groundData.users[message.author.id];
    if (g && g.until > Date.now()) {
      await message.delete().catch(() => {});
      return;
    } else if (g && g.until <= Date.now()) {
      delete groundData.users[message.author.id];
      saveJson("ground.json", groundData);
    }

    // XP SYSTEM – ONLY IN CHAT_XP_CHANNEL
    if (message.channel.id === CHAT_XP_CHANNEL) {
      if (message.content.startsWith("/") || message.content.startsWith("!")) {
        misuseCounts[message.author.id] = (misuseCounts[message.author.id] || 0) + 1;

        if (misuseCounts[message.author.id] === 1) {
          const embed = new EmbedBuilder()
            .setColor("#ED0000")
            .setDescription("stop using commands here, bitch. learn how to use channels.")
            .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." });
          return message.reply({ embeds: [embed] });
        } else if (misuseCounts[message.author.id] >= 2) {
          const duration = 5;
          const reason = "learn how to use channels bitch";
          const until = Date.now() + duration * 60 * 1000;
          groundData.users[message.author.id] = { until, reason };
          saveJson("ground.json", groundData);

          const embed = new EmbedBuilder()
            .setColor("#ED0000")
            .setDescription(
              `you got grounded for **${duration}** minutes for spamming commands here, bitch.`
            )
            .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." });

          await message.reply({ embeds: [embed] });

          try {
            const dmEmbed = new EmbedBuilder()
              .setColor("#ED0000")
              .setDescription(
                `you've been grounded for **${duration}** minutes due to **${reason}** , start behaving, bitch!`
              )
              .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." });
            const u = await client.users.fetch(message.author.id);
            await u.send({ embeds: [dmEmbed] }).catch(() => {});
          } catch {}

          return;
        }
      }

      if (!xpData.users[message.author.id]) {
        xpData.users[message.author.id] = { xp: 0, messages: 0, levelIndex: 0 };
      }
      const data = xpData.users[message.author.id];

      let oldIndex = data.levelIndex || 0;

      let xpGain = 0;
      const words = message.content.trim().split(/\s+/).filter(Boolean);
      xpGain += words.length;

      if (message.attachments.size > 0) {
        xpGain += 10;
      }

      data.xp += xpGain;
      data.messages += 1;

      const xp = data.xp;
      let newIndex = 0;
      for (let i = 0; i < XP_THRESHOLDS.length; i++) {
        if (xp >= XP_THRESHOLDS[i].xp) newIndex = i;
        else break;
      }
      data.levelIndex = newIndex;

      saveJson("xpData.json", xpData);

      const member = await guild.members.fetch(message.author.id).catch(() => null);
      if (!member) return;

      for (const t of XP_THRESHOLDS) {
        if (xp >= t.xp) {
          if (!member.roles.cache.has(t.role)) {
            await member.roles.add(t.role).catch(() => {});
          }
        } else {
          if (member.roles.cache.has(t.role)) {
            await member.roles.remove(t.role).catch(() => {});
          }
        }
      }

      if (newIndex > oldIndex) {
        const nextRole = XP_THRESHOLDS[newIndex + 1] || null;
        const channel = guild.channels.cache.get(LEVEL_CHANNEL);
        if (channel) {
          const embed = new EmbedBuilder()
            .setColor("#ED0000")
            .setDescription(
              `<@${message.author.id}> leveled up, bitch.\n` +
              `Current XP: **${xp}**\n` +
              (nextRole
                ? `Next role: <@&${nextRole.role}> at **${nextRole.xp}** XP`
                : `You're at the top, bitch.`)
            )
            .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." });

          await channel.send({ content: `<@${message.author.id}>`, embeds: [embed] });
        }
      }

      return;
    }
  } catch (e) {
    console.error("messageCreate error:", e);
  }
});

// ===============================
// REACTION ROLE HANDLER
// ===============================
client.on("messageReactionAdd", async (reaction, user) => {
  try {
    if (user.bot) return;
    if (reaction.partial) await reaction.fetch();

    const rrData = loadJson("reactionroles.json", {});
    const entry = rrData[reaction.message.id];
    if (!entry) return;

    const idx = entry.emojis.indexOf(reaction.emoji.name);
    if (idx === -1) return;

    const roleId = entry.roles[idx];
    const guild = reaction.message.guild;
    const member = await guild.members.fetch(user.id).catch(() => null);
    if (!member) return;

    await member.roles.add(roleId).catch(() => {});
  } catch (e) {
    console.error("reaction add error:", e);
  }
});

client.on("messageReactionRemove", async (reaction, user) => {
  try {
    if (user.bot) return;
    if (reaction.partial) await reaction.fetch();

    const rrData = loadJson("reactionroles.json", {});
    const entry = rrData[reaction.message.id];
    if (!entry) return;

    const idx = entry.emojis.indexOf(reaction.emoji.name);
    if (idx === -1) return;

    const roleId = entry.roles[idx];
    const guild = reaction.message.guild;
    const member = await guild.members.fetch(user.id).catch(() => null);
    if (!member) return;

    await member.roles.remove(roleId).catch(() => {});
  } catch (e) {
    console.error("reaction remove error:", e);
  }
});

// ===============================
// LOGIN
// ===============================
client.login(process.env.TOKEN);
