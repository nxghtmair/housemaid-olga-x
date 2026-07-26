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
  users: {} // userId: { xp, messages }
});

let economyData = loadJson("economy.json", {
  users: {} // userId: { wallet, bank }
});

let jobsData = loadJson("jobs.json", {
  users: {} // userId: { job: "cook" | null, lastActivity, completedOrders }
});

let ordersData = loadJson("orders.json", {
  nextId: 1,
  orders: [] // { id, userId, food, status, cookId, createdAt, deliveredAt }
});

const FOOTER_TEXT = ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·.";

// ===============================
// DISCORD CLIENT
// ===============================
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
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
const CHAT_XP_CHANNEL = "1513932845922385920";
const EXTRA_XP_CHANNEL = "1530116858760663151";

const LEVEL_CHANNEL = "1517175386021040138";

const ORDER_CHANNEL = "1530750401995866312";
const COOK_ROLE = "1530751512752558131";

const SALARY_CHANNEL = "1517175386021040138";

const BOT_MASTER = "1193517948401373257";

const XP_THRESHOLDS = [
  { xp: 0 },
  { xp: 500 },
  { xp: 1000 },
  { xp: 1500 },
  { xp: 2000 },
  { xp: 3000 },
  { xp: 10000 }
];

// ===============================
// HELPERS
// ===============================
function makeEmbed(description, title = null) {
  const embed = new EmbedBuilder()
    .setColor("#ED0000")
    .setDescription(description)
    .setFooter({ text: FOOTER_TEXT });
  if (title) embed.setTitle(title);
  return embed;
}

function getEcoUser(id) {
  if (!economyData.users[id]) {
    economyData.users[id] = { wallet: 0, bank: 0 };
    saveJson("economy.json", economyData);
  }
  return economyData.users[id];
}

function getXpUser(id) {
  if (!xpData.users[id]) {
    xpData.users[id] = { xp: 0, messages: 0 };
    saveJson("xpData.json", xpData);
  }
  return xpData.users[id];
}

function getJobUser(id) {
  if (!jobsData.users[id]) {
    jobsData.users[id] = { job: null, lastActivity: 0, completedOrders: 0 };
    saveJson("jobs.json", jobsData);
  }
  return jobsData.users[id];
}

function buildProgressBar(currentXp, currentThresholdXp, nextThresholdXp) {
  if (nextThresholdXp === null) {
    return "🟢🟢🟢🟢🟢🟢🟢🟢 100%";
  }
  const span = nextThresholdXp - currentThresholdXp;
  const gained = currentXp - currentThresholdXp;
  let percent = span <= 0 ? 1 : gained / span;
  if (percent < 0) percent = 0;
  if (percent > 1) percent = 1;
  const segments = 8;
  const perSegment = 1 / segments;
  let bar = "";
  for (let i = 0; i < segments; i++) {
    const threshold = perSegment * (i + 1);
    bar += percent >= threshold ? "🟢" : "🔴";
  }
  const pctDisplay = Math.round(percent * 100);
  return `${bar} ${pctDisplay}%`;
}

function getLevelIndexFromXp(xp) {
  let idx = 0;
  for (let i = 0; i < XP_THRESHOLDS.length; i++) {
    if (xp >= XP_THRESHOLDS[i].xp) idx = i;
  }
  return idx;
}

function createOrder(userId, food) {
  const id = ordersData.nextId++;
  const order = {
    id,
    userId,
    food,
    status: "pending",
    cookId: null,
    createdAt: Date.now(),
    deliveredAt: null
  };
  ordersData.orders.push(order);
  saveJson("orders.json", ordersData);
  return order;
}

function getPendingOrders() {
  return ordersData.orders.filter(o => o.status === "pending");
}

function getCookCompletedOrders(cookId) {
  return ordersData.orders.filter(o => o.cookId === cookId && o.status === "completed");
}

function randomCookPayment() {
  const roll = Math.random();
  if (roll <= 0.01) {
    return { amount: 100, rare: true };
  }
  const amount = Math.floor(Math.random() * 15) + 1;
  return { amount, rare: false };
}

// ===============================
// READY
// ===============================
client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  await client.user.setPresence({
    status: "idle",
    activities: [{ name: "⇢ ˗ˏˋ Olgasm; V0.8 ࿐ྂ", type: 1 }]
  });

  // Slash commands
  await client.application.commands.set([
    // Leaderboard with subcommands
    new SlashCommandBuilder()
      .setName("leaderboard")
      .setDescription("leaderboards, bitch.")
      .addSubcommand(s =>
        s.setName("economy")
          .setDescription("economy leaderboard, bitch.")
      )
      .addSubcommand(s =>
        s.setName("chat")
          .setDescription("chat leaderboard, bitch.")
      ),

    // XP stats
    new SlashCommandBuilder()
      .setName("stats")
      .setDescription("show your xp stats, bitch."),

    // Economy cash
    new SlashCommandBuilder()
      .setName("cash")
      .setDescription("show your filthy money, bitch."),

    // Job list
    new SlashCommandBuilder()
      .setName("joblist")
      .setDescription("see jobs, bitch."),

    // Job panel
    new SlashCommandBuilder()
      .setName("jobpanel")
      .setDescription("your job panel, bitch."),

    // Order command
    new SlashCommandBuilder()
      .setName("order")
      .setDescription("order food, bitch.")
      .addStringOption(o =>
        o.setName("food")
          .setDescription("desired food, bitch.")
          .setRequired(true)
      ),

    // Shutdown (for master)
    new SlashCommandBuilder()
      .setName("shutdown")
      .setDescription("shutdown, bitch.")
  ]);

  console.log("Slash commands registered.");

  // HOURLY SALARY FOR COOKS
  setInterval(async () => {
    try {
      const guilds = client.guilds.cache;
      for (const [, guild] of guilds) {
        const salaryChannel = guild.channels.cache.get(SALARY_CHANNEL);
        if (!salaryChannel) continue;

        await guild.members.fetch();

        for (const userId in jobsData.users) {
          const jobInfo = jobsData.users[userId];
          if (jobInfo.job !== "cook") continue;

          const eco = getEcoUser(userId);
          eco.wallet += 2;
          saveJson("economy.json", economyData);

          const member = guild.members.cache.get(userId);
          if (!member) continue;

          const embed = new EmbedBuilder()
            .setColor("#ED0000")
            .setDescription(
              `<@&${COOK_ROLE}> hourly salary dropped, bitch.\n` +
              `<@${userId}> got **2** turds for being a cook.`
            )
            .setFooter({ text: FOOTER_TEXT });

          await salaryChannel.send({
            content: `<@&${COOK_ROLE}>`,
            embeds: [embed]
          });
        }
      }
    } catch (e) {
      console.error("Salary error:", e);
    }
  }, 60 * 60 * 1000); // hourly

  // DAILY INACTIVITY CHECK FOR COOKS
  setInterval(async () => {
    try {
      const now = Date.now();
      const oneDay = 24 * 60 * 60 * 1000;

      const guilds = client.guilds.cache;
      for (const [, guild] of guilds) {
        const salaryChannel = guild.channels.cache.get(SALARY_CHANNEL);
        if (!salaryChannel) continue;

        await guild.members.fetch();

        for (const userId in jobsData.users) {
          const jobInfo = jobsData.users[userId];
          if (jobInfo.job !== "cook") continue;

          if (!jobInfo.lastActivity || now - jobInfo.lastActivity > oneDay) {
            jobInfo.job = null;
            jobInfo.lastActivity = 0;
            saveJson("jobs.json", jobsData);

            const member = guild.members.cache.get(userId);
            if (member) {
              if (member.roles.cache.has(COOK_ROLE)) {
                await member.roles.remove(COOK_ROLE).catch(() => {});
              }
            }

            const embed = new EmbedBuilder()
              .setColor("#ED0000")
              .setDescription(
                `<@${userId}> got fired for being inactive, bitch.\n` +
                `cook job terminated.`
              )
              .setFooter({ text: FOOTER_TEXT });

            await salaryChannel.send({
              content: `<@${userId}>`,
              embeds: [embed]
            });
          }
        }
      }
    } catch (e) {
      console.error("Inactivity check error:", e);
    }
  }, 60 * 60 * 1000); // check hourly
});

// ===============================
// INTERACTIONS
// ===============================
client.on("interactionCreate", async (interaction) => {
  try {
    // All replies visible, all embeds
    if (interaction.isChatInputCommand()) {
      const { commandName } = interaction;

      // SHUTDOWN
      if (commandName === "shutdown") {
        if (interaction.user.id !== BOT_MASTER) {
          const e = makeEmbed("you ain't my master, bitch.");
          return interaction.reply({ embeds: [e] });
        }
        const e = makeEmbed("shutting down, bitch.");
        await interaction.reply({ embeds: [e] });
        process.exit(0);
      }

      // CASH
      if (commandName === "cash") {
        const eco = getEcoUser(interaction.user.id);

        const embed = new EmbedBuilder()
          .setColor("#ED0000")
          .setTitle("Your filthy money, bitch.")
          .setDescription(
            `Wallet: **${eco.wallet}** turds\n` +
            `Bank: **${eco.bank}** turds`
          )
          .setFooter({ text: FOOTER_TEXT });

        return interaction.reply({ embeds: [embed] });
      }

      // STATS (XP)
      if (commandName === "stats") {
        const userId = interaction.user.id;
        const xpUser = getXpUser(userId);

        const currentXp = xpUser.xp;
        const currentIndex = getLevelIndexFromXp(currentXp);
        const currentThreshold = XP_THRESHOLDS[currentIndex];
        const nextThreshold = XP_THRESHOLDS[currentIndex + 1] || null;

        const currentXpBase = currentThreshold.xp;
        const nextXpTarget = nextThreshold ? nextThreshold.xp : null;

        const remaining = nextXpTarget ? Math.max(0, nextXpTarget - currentXp) : 0;
        const bar = buildProgressBar(currentXp, currentXpBase, nextXpTarget);

        const guild = interaction.guild;
        const member = guild ? await guild.members.fetch(userId).catch(() => null) : null;
        const avatarUrl = member
          ? member.displayAvatarURL({ dynamic: true })
          : interaction.user.displayAvatarURL({ dynamic: true });

        const embed = new EmbedBuilder()
          .setColor("#ED0000")
          .setTitle(`XP stats for <@${userId}>, bitch.`)
          .setThumbnail(avatarUrl)
          .setDescription(
            `XP: **${currentXp}**\n` +
            (nextXpTarget
              ? `Next rank at: **${nextXpTarget}** XP\n` +
                `Remaining XP: **${remaining}**\n` +
                `Progress: ${bar}`
              : `you already at top, bitch.\nProgress: 🟢🟢🟢🟢🟢🟢🟢🟢 100%`)
          )
          .setFooter({ text: FOOTER_TEXT });

        return interaction.reply({ embeds: [embed] });
      }

      // LEADERBOARD
      if (commandName === "leaderboard") {
        const sub = interaction.options.getSubcommand();

        if (sub === "economy") {
          const entries = Object.entries(economyData.users)
            .sort((a, b) => (b[1].wallet + b[1].bank) - (a[1].wallet + a[1].bank));

          if (entries.length === 0) {
            const e = makeEmbed("no turds yet, bitch.");
            return interaction.reply({ embeds: [e] });
          }

          const pageSize = 10;
          const page = 0;

          const pageEntries = entries.slice(page * pageSize, (page + 1) * pageSize);

          const desc = pageEntries
            .map(
              ([id, data], i) =>
                `#${page * pageSize + i + 1} <@${id}> – wallet: ${data.wallet}, bank: ${data.bank}, total: ${
                  data.wallet + data.bank
                }`
            )
            .join("\n");

          const embed = new EmbedBuilder()
            .setColor("#ED0000")
            .setTitle("Economy leaderboard, bitch.")
            .setDescription(desc)
            .setFooter({ text: FOOTER_TEXT });

          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`lb_economy_prev_${interaction.user.id}_0`)
              .setLabel("Prev")
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(true),
            new ButtonBuilder()
              .setCustomId(`lb_economy_next_${interaction.user.id}_0`)
              .setLabel("Next")
              .setStyle(ButtonStyle.Primary)
              .setDisabled(entries.length <= pageSize)
          );

          return interaction.reply({ embeds: [embed], components: [row] });
        }

        if (sub === "chat") {
          const entries = Object.entries(xpData.users)
            .sort((a, b) => b[1].xp - a[1].xp);

          if (entries.length === 0) {
            const e = makeEmbed("no chat data yet, bitch.");
            return interaction.reply({ embeds: [e] });
          }

          const pageSize = 10;
          const page = 0;

          const pageEntries = entries.slice(page * pageSize, (page + 1) * pageSize);

          const desc = pageEntries
            .map(
              ([id, data], i) =>
                `#${page * pageSize + i + 1} <@${id}> – messages: ${data.messages}, XP: ${data.xp}`
            )
            .join("\n");

          const embed = new EmbedBuilder()
            .setColor("#ED0000")
            .setTitle("Chat leaderboard, bitch.")
            .setDescription(desc)
            .setFooter({ text: FOOTER_TEXT });

          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`lb_chat_prev_${interaction.user.id}_0`)
              .setLabel("Prev")
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(true),
            new ButtonBuilder()
              .setCustomId(`lb_chat_next_${interaction.user.id}_0`)
              .setLabel("Next")
              .setStyle(ButtonStyle.Primary)
              .setDisabled(entries.length <= pageSize)
          );

          return interaction.reply({ embeds: [embed], components: [row] });
        }
      }

      // JOBLIST
      if (commandName === "joblist") {
        const userId = interaction.user.id;
        const jobInfo = getJobUser(userId);

        const embed = new EmbedBuilder()
          .setColor("#ED0000")
          .setTitle("Job list, bitch.")
          .setDescription(
            `Current job: **${jobInfo.job ? jobInfo.job : "none"}**\n\n` +
            `Pick a job, bitch.`
          )
          .setFooter({ text: FOOTER_TEXT });

        const select = new StringSelectMenuBuilder()
          .setCustomId(`joblist_select_${userId}`)
          .setPlaceholder("Choose job, bitch.")
          .addOptions([
            {
              label: "Cook",
              value: "cook",
              description: "cook food, bitch."
            }
          ]);

        const row = new ActionRowBuilder().addComponents(select);

        return interaction.reply({ embeds: [embed], components: [row] });
      }

      // JOBPANEL
      if (commandName === "jobpanel") {
        const userId = interaction.user.id;
        const jobInfo = getJobUser(userId);

        if (!jobInfo.job) {
          const e = makeEmbed("you got no job, bitch.");
          return interaction.reply({ embeds: [e] });
        }

        if (jobInfo.job === "cook") {
          const embed = new EmbedBuilder()
            .setColor("#ED0000")
            .setTitle("Cook job panel, bitch.")
            .setDescription(
              "Use the panel, bitch.\n\n" +
              "Options:\n" +
              "- Orders\n" +
              "- Orders Log"
            )
            .setFooter({ text: FOOTER_TEXT });

          const select = new StringSelectMenuBuilder()
            .setCustomId(`jobpanel_cook_${userId}`)
            .setPlaceholder("Choose panel option, bitch.")
            .addOptions([
              {
                label: "Orders",
                value: "orders",
                description: "see current orders, bitch."
              },
              {
                label: "Orders Log",
                value: "orders_log",
                description: "see completed orders, bitch."
              }
            ]);

          const row = new ActionRowBuilder().addComponents(select);

          return interaction.reply({ embeds: [embed], components: [row] });
        }

        const e = makeEmbed("this job ain't got a panel yet, bitch.");
        return interaction.reply({ embeds: [e] });
      }

      // ORDER
      if (commandName === "order") {
        if (interaction.channel.id !== ORDER_CHANNEL) {
          const e = makeEmbed("wrong channel, bitch. order in the right place.");
          return interaction.reply({ embeds: [e] });
        }

        const food = interaction.options.getString("food");
        const order = createOrder(interaction.user.id, food);

        const embed = new EmbedBuilder()
          .setColor("#ED0000")
          .setTitle("Order placed, bitch.")
          .setDescription(
            `<@${interaction.user.id}> your order is in.\n\n` +
            `Order #${order.id}\n` +
            `Food: **${order.food}**`
          )
          .setFooter({ text: FOOTER_TEXT });

        return interaction.reply({
          content: `<@${interaction.user.id}>`,
          embeds: [embed]
        });
      }
    }

    // BUTTONS & SELECT MENUS & MODALS
    if (interaction.isButton()) {
      const id = interaction.customId;

      // Leaderboard paging
      if (id.startsWith("lb_")) {
        const parts = id.split("_"); // lb, type, dir, executorId, page
        const type = parts[1];
        const dir = parts[2];
        const executorId = parts[3];
        let page = parseInt(parts[4]);

        if (interaction.user.id !== executorId) {
          const e = makeEmbed("this ain't your leaderboard, bitch.");
          return interaction.reply({ embeds: [e] });
        }

        const pageSize = 10;

        if (dir === "next") page++;
        if (dir === "prev") page = Math.max(0, page - 1);

        if (type === "economy") {
          const entries = Object.entries(economyData.users)
            .sort((a, b) => (b[1].wallet + b[1].bank) - (a[1].wallet + a[1].bank));

          const pageEntries = entries.slice(page * pageSize, (page + 1) * pageSize);

          if (pageEntries.length === 0 && page > 0) {
            page--;
          }

          const finalEntries = entries.slice(page * pageSize, (page + 1) * pageSize);

          const desc = finalEntries
            .map(
              ([id2, data], i) =>
                `#${page * pageSize + i + 1} <@${id2}> – wallet: ${data.wallet}, bank: ${data.bank}, total: ${
                  data.wallet + data.bank
                }`
            )
            .join("\n") || "no turds, bitch.";

          const embed = new EmbedBuilder()
            .setColor("#ED0000")
            .setTitle("Economy leaderboard, bitch.")
            .setDescription(desc)
            .setFooter({ text: FOOTER_TEXT });

          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`lb_economy_prev_${executorId}_${page}`)
              .setLabel("Prev")
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(page === 0),
            new ButtonBuilder()
              .setCustomId(`lb_economy_next_${executorId}_${page}`)
              .setLabel("Next")
              .setStyle(ButtonStyle.Primary)
              .setDisabled(entries.length <= (page + 1) * pageSize)
          );

          return interaction.update({ embeds: [embed], components: [row] });
        }

        if (type === "chat") {
          const entries = Object.entries(xpData.users)
            .sort((a, b) => b[1].xp - a[1].xp);

          const pageEntries = entries.slice(page * pageSize, (page + 1) * pageSize);

          if (pageEntries.length === 0 && page > 0) {
            page--;
          }

          const finalEntries = entries.slice(page * pageSize, (page + 1) * pageSize);

          const desc = finalEntries
            .map(
              ([id2, data], i) =>
                `#${page * pageSize + i + 1} <@${id2}> – messages: ${data.messages}, XP: ${data.xp}`
            )
            .join("\n") || "no chat data, bitch.";

          const embed = new EmbedBuilder()
            .setColor("#ED0000")
            .setTitle("Chat leaderboard, bitch.")
            .setDescription(desc)
            .setFooter({ text: FOOTER_TEXT });

          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`lb_chat_prev_${executorId}_${page}`)
              .setLabel("Prev")
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(page === 0),
            new ButtonBuilder()
              .setCustomId(`lb_chat_next_${executorId}_${page}`)
              .setLabel("Next")
              .setStyle(ButtonStyle.Primary)
              .setDisabled(entries.length <= (page + 1) * pageSize)
          );

          return interaction.update({ embeds: [embed], components: [row] });
        }
      }

      // Cancel hate button
      if (id.startsWith("cancel_hate_")) {
        const e = makeEmbed("yeah bitch, cancelled with pure hate.");
        return interaction.reply({ embeds: [e] });
      }

      // Orders claim / delete buttons handled via select + modal, so no extra buttons here
    }

    if (interaction.isStringSelectMenu()) {
      const id = interaction.customId;

      // Joblist select
      if (id.startsWith("joblist_select_")) {
        const executorId = id.split("_")[2];
        if (interaction.user.id !== executorId) {
          const e = makeEmbed("this ain't your joblist, bitch.");
          return interaction.reply({ embeds: [e] });
        }

        const value = interaction.values[0];
        const jobInfo = getJobUser(interaction.user.id);
        jobInfo.job = value;
        jobInfo.lastActivity = Date.now();
        saveJson("jobs.json", jobsData);

        if (value === "cook") {
          const guild = interaction.guild;
          if (guild) {
            await guild.members.fetch();
            const member = guild.members.cache.get(interaction.user.id);
            if (member && !member.roles.cache.has(COOK_ROLE)) {
              await member.roles.add(COOK_ROLE).catch(() => {});
            }
          }
        }

        const embed = new EmbedBuilder()
          .setColor("#ED0000")
          .setTitle("Job set, bitch.")
          .setDescription(`you are now a **${value}**, bitch.`)
          .setFooter({ text: FOOTER_TEXT });

        return interaction.update({ embeds: [embed], components: [] });
      }

      // Jobpanel cook
      if (id.startsWith("jobpanel_cook_")) {
        const executorId = id.split("_")[2];
        if (interaction.user.id !== executorId) {
          const e = makeEmbed("this ain't your jobpanel, bitch.");
          return interaction.reply({ embeds: [e] });
        }

        const choice = interaction.values[0];

        if (choice === "orders") {
          const pending = getPendingOrders();

          let desc;
          if (pending.length === 0) {
            desc = "no orders right now, bitch.";
          } else {
            desc = pending
              .map(
                o =>
                  `#${o.id} – <@${o.userId}> – food: **${o.food}**`
              )
              .join("\n");
          }

          const embed = new EmbedBuilder()
            .setColor("#ED0000")
            .setTitle("Current orders, bitch.")
            .setDescription(desc)
            .setFooter({ text: FOOTER_TEXT });

          const options = pending.map(o => ({
            label: `Order #${o.id}`,
            value: String(o.id),
            description: `food: ${o.food}`
          }));

          const selectOrders =
            pending.length > 0
              ? new StringSelectMenuBuilder()
                  .setCustomId(`cook_orders_claim_${executorId}`)
                  .setPlaceholder("Claim an order, bitch.")
                  .addOptions(options)
              : null;

          const deleteButton =
            pending.length > 0
              ? new ButtonBuilder()
                  .setCustomId(`cook_orders_delete_${executorId}`)
                  .setLabel("Delete order, bitch.")
                  .setStyle(ButtonStyle.Danger)
              : null;

          const backButton = new ButtonBuilder()
            .setCustomId(`cook_orders_back_${executorId}`)
            .setLabel("Back to panel, bitch.")
            .setStyle(ButtonStyle.Secondary);

          const rows = [];

          if (selectOrders) {
            rows.push(new ActionRowBuilder().addComponents(selectOrders));
          }

          const buttons = [];
          if (deleteButton) buttons.push(deleteButton);
          buttons.push(backButton);

          rows.push(new ActionRowBuilder().addComponents(...buttons));

          return interaction.update({ embeds: [embed], components: rows });
        }

        if (choice === "orders_log") {
          const completed = getCookCompletedOrders(interaction.user.id);

          let desc;
          if (completed.length === 0) {
            desc = "you got no completed orders yet, bitch.";
          } else {
            desc = completed
              .map(
                o =>
                  `#${o.id} – <@${o.userId}> – food: **${o.food}** – delivered at: ${new Date(
                    o.deliveredAt
                  ).toLocaleString()}`
              )
              .join("\n");
          }

          const embed = new EmbedBuilder()
            .setColor("#ED0000")
            .setTitle("Orders log, bitch.")
            .setDescription(desc)
            .setFooter({ text: FOOTER_TEXT });

          const backButton = new ButtonBuilder()
            .setCustomId(`cook_orders_back_${executorId}`)
            .setLabel("Back to panel, bitch.")
            .setStyle(ButtonStyle.Secondary);

          const row = new ActionRowBuilder().addComponents(backButton);

          return interaction.update({ embeds: [embed], components: [row] });
        }
      }

      // Cook orders claim select
      if (id.startsWith("cook_orders_claim_")) {
        const executorId = id.split("_")[3];
        if (interaction.user.id !== executorId) {
          const e = makeEmbed("this ain't your orders, bitch.");
          return interaction.reply({ embeds: [e] });
        }

        const orderId = parseInt(interaction.values[0]);
        const order = ordersData.orders.find(o => o.id === orderId && o.status === "pending");
        if (!order) {
          const e = makeEmbed("order is gone, bitch.");
          return interaction.reply({ embeds: [e] });
        }

        const modal = new ModalBuilder()
          .setCustomId(`cook_order_claim_modal_${orderId}_${executorId}`)
          .setTitle(`Deliver order #${orderId}, bitch.`);

        const imgInput = new TextInputBuilder()
          .setCustomId("image_url")
          .setLabel("Image link, bitch.")
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        const outroInput = new TextInputBuilder()
          .setCustomId("delivery_outro")
          .setLabel("Delivery outro, bitch.")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true);

        modal.addComponents(
          new ActionRowBuilder().addComponents(imgInput),
          new ActionRowBuilder().addComponents(outroInput)
        );

        return interaction.showModal(modal);
      }

      // Cook orders delete button
      if (id.startsWith("cook_orders_delete_")) {
        const executorId = id.split("_")[3];
        if (interaction.user.id !== executorId) {
          const e = makeEmbed("this ain't your orders, bitch.");
          return interaction.reply({ embeds: [e] });
        }

        const pending = getPendingOrders();
        if (pending.length === 0) {
          const e = makeEmbed("no orders to delete, bitch.");
          return interaction.reply({ embeds: [e] });
        }

        const options = pending.map(o => ({
          label: `Order #${o.id}`,
          value: String(o.id),
          description: `food: ${o.food}`
        }));

        const select = new StringSelectMenuBuilder()
          .setCustomId(`cook_orders_delete_select_${executorId}`)
          .setPlaceholder("Choose order to delete, bitch.")
          .addOptions(options);

        const embed = new EmbedBuilder()
          .setColor("#ED0000")
          .setTitle("Delete order, bitch.")
          .setDescription("pick an order to cancel, bitch.")
          .setFooter({ text: FOOTER_TEXT });

        const row = new ActionRowBuilder().addComponents(select);

        return interaction.reply({ embeds: [embed], components: [row] });
      }

      // Cook orders delete select
      if (id.startsWith("cook_orders_delete_select_")) {
        const executorId = id.split("_")[4];
        if (interaction.user.id !== executorId) {
          const e = makeEmbed("this ain't your orders, bitch.");
          return interaction.reply({ embeds: [e] });
        }

        const orderId = parseInt(interaction.values[0]);
        const order = ordersData.orders.find(o => o.id === orderId && o.status === "pending");
        if (!order) {
          const e = makeEmbed("order is gone, bitch.");
          return interaction.reply({ embeds: [e] });
        }

        const modal = new ModalBuilder()
          .setCustomId(`cook_order_delete_modal_${orderId}_${executorId}`)
          .setTitle(`Cancel order #${orderId}, bitch.`);

        const reasonInput = new TextInputBuilder()
          .setCustomId("reason")
          .setLabel("Reason for cancelling, bitch.")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));

        return interaction.showModal(modal);
      }

      // Back to panel
      if (id.startsWith("cook_orders_back_")) {
        const executorId = id.split("_")[3];
        if (interaction.user.id !== executorId) {
          const e = makeEmbed("this ain't your panel, bitch.");
          return interaction.reply({ embeds: [e] });
        }

        const embed = new EmbedBuilder()
          .setColor("#ED0000")
          .setTitle("Cook job panel, bitch.")
          .setDescription(
            "Use the panel, bitch.\n\n" +
            "Options:\n" +
            "- Orders\n" +
            "- Orders Log"
          )
          .setFooter({ text: FOOTER_TEXT });

        const select = new StringSelectMenuBuilder()
          .setCustomId(`jobpanel_cook_${executorId}`)
          .setPlaceholder("Choose panel option, bitch.")
          .addOptions([
            {
              label: "Orders",
              value: "orders",
              description: "see current orders, bitch."
            },
            {
              label: "Orders Log",
              value: "orders_log",
              description: "see completed orders, bitch."
            }
          ]);

        const row = new ActionRowBuilder().addComponents(select);

        return interaction.update({ embeds: [embed], components: [row] });
      }
    }

    if (interaction.isModalSubmit()) {
      const id = interaction.customId;

      // Claim order modal
      if (id.startsWith("cook_order_claim_modal_")) {
        const parts = id.split("_"); // cook, order, claim, modal, orderId, cookId
        const orderId = parseInt(parts[4]);
        const cookId = parts[5];

        if (interaction.user.id !== cookId) {
          const e = makeEmbed("this ain't your order, bitch.");
          return interaction.reply({ embeds: [e] });
        }

        const order = ordersData.orders.find(o => o.id === orderId && o.status === "pending");
        if (!order) {
          const e = makeEmbed("order is gone, bitch.");
          return interaction.reply({ embeds: [e] });
        }

        const imageUrl = interaction.fields.getTextInputValue("image_url");
        const deliveryOutro = interaction.fields.getTextInputValue("delivery_outro");

        order.status = "completed";
        order.cookId = cookId;
        order.deliveredAt = Date.now();
        saveJson("orders.json", ordersData);

        const jobInfo = getJobUser(cookId);
        jobInfo.lastActivity = Date.now();
        jobInfo.completedOrders += 1;
        saveJson("jobs.json", jobsData);

        const eco = getEcoUser(cookId);
        const payment = randomCookPayment();
        eco.wallet += payment.amount;
        saveJson("economy.json", economyData);

        const guild = interaction.guild;
        const member = guild ? await guild.members.fetch(cookId).catch(() => null) : null;
        const nickname = member ? (member.nickname || member.user.username) : interaction.user.username;

        const orderChannel = guild ? guild.channels.cache.get(ORDER_CHANNEL) : null;

        const embed = new EmbedBuilder()
          .setColor("#ED0000")
          .setTitle("Order delivered, bitch.")
          .setDescription(
            `<@${order.userId}> your order got delivered, bitch.\n\n` +
            `Order #${order.id}\n` +
            `Food: **${order.food}**\n\n` +
            `${deliveryOutro}\n\n` +
            `Cook got **${payment.amount}** turds${
              payment.rare ? " (CGS BITCH – rare drop)" : ""
            }.`
          )
          .setImage(imageUrl)
          .setFooter({ text: FOOTER_TEXT });

        if (orderChannel) {
          await orderChannel.send({
            content: `<@${order.userId}>`,
            embeds: [embed]
          });
        }

        const confirmEmbed = makeEmbed("order delivered, bitch.");
        await interaction.reply({ embeds: [confirmEmbed] });

        try {
          const dmEmbed = new EmbedBuilder()
            .setColor("#ED0000")
            .setTitle("Order delivered, bitch.")
            .setDescription(
              `Order #${order.id} delivered.\n` +
              `Food: **${order.food}**\n\n` +
              `${deliveryOutro}`
            )
            .setImage(imageUrl)
            .setFooter({ text: FOOTER_TEXT });

          await client.users.send(order.userId, { embeds: [dmEmbed] });
        } catch {}
      }

      // Delete order modal
      if (id.startsWith("cook_order_delete_modal_")) {
        const parts = id.split("_"); // cook, order, delete, modal, orderId, cookId
        const orderId = parseInt(parts[4]);
        const cookId = parts[5];

        if (interaction.user.id !== cookId) {
          const e = makeEmbed("this ain't your order, bitch.");
          return interaction.reply({ embeds: [e] });
        }

        const order = ordersData.orders.find(o => o.id === orderId && o.status === "pending");
        if (!order) {
          const e = makeEmbed("order is gone, bitch.");
          return interaction.reply({ embeds: [e] });
        }

        const reason = interaction.fields.getTextInputValue("reason");

        order.status = "cancelled";
        order.cookId = cookId;
        saveJson("orders.json", ordersData);

        const guild = interaction.guild;
        const member = guild ? await guild.members.fetch(cookId).catch(() => null) : null;
        const nickname = member ? (member.nickname || member.user.username) : interaction.user.username;

        try {
          const dmEmbed = new EmbedBuilder()
            .setColor("#ED0000")
            .setTitle("Order cancelled, bitch.")
            .setDescription(
              `Order #${order.id} got cancelled, bitch.\n\n` +
              `Reason: ${reason}`
            )
            .setFooter({ text: FOOTER_TEXT });

          const button = new ButtonBuilder()
            .setCustomId(`cancel_hate_${order.id}`)
            .setLabel(`Cancelled with pure hate from: ${nickname}`)
            .setStyle(ButtonStyle.Danger);

          const row = new ActionRowBuilder().addComponents(button);

          await client.users.send(order.userId, {
            embeds: [dmEmbed],
            components: [row]
          });
        } catch {}

        const confirmEmbed = makeEmbed("order cancelled, bitch.");
        return interaction.reply({ embeds: [confirmEmbed] });
      }
    }
  } catch (err) {
    console.error("Interaction error:", err);
    if (interaction.isRepliable()) {
      try {
        const e = makeEmbed("something broke, bitch.");
        await interaction.reply({ embeds: [e] });
      } catch {}
    }
  }
});

// ===============================
// MESSAGE CREATE (XP + DM)
// ===============================
client.on("messageCreate", async (msg) => {
  if (msg.author.bot) return;

  // XP system in chat channels
  if (msg.guild) {
    try {
      const xpUser = getXpUser(msg.author.id);
      xpUser.messages += 1;
      const gained = Math.floor(Math.random() * 11) + 5;
      xpUser.xp += gained;
      saveJson("xpData.json", xpData);

      const isXpChannel =
        msg.channel.id === CHAT_XP_CHANNEL || msg.channel.id === EXTRA_XP_CHANNEL;

      if (isXpChannel) {
        const guild = msg.guild;
        const channel = guild.channels.cache.get(LEVEL_CHANNEL);
        if (channel) {
          const embed = new EmbedBuilder()
            .setColor("#ED0000")
            .setDescription(
              `<@${msg.author.id}> gained **${gained}** XP, bitch.\n` +
              `Total XP: **${xpUser.xp}**`
            )
            .setFooter({ text: FOOTER_TEXT });

          await channel.send({
            content: `<@${msg.author.id}>`,
            embeds: [embed]
          });
        }
      }
    } catch (e) {
      console.error("XP error:", e);
    }
  }
});

// ===============================
// SHUTDOWN
// ===============================
process.on("SIGINT", () => {
  console.log("Shutting down...");
  process.exit(0);
});

client.login(process.env.TOKEN);
