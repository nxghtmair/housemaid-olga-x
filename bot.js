const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActivityType,
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  PermissionFlagsBits
} = require("discord.js");
const fs = require("fs");
require("dotenv").config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// COLORS, FOOTER, CHANNELS, BANNERS
const AZURITE_BLUE = "#007FFF";
const BURGUNDY = "#800020";
const OLGA_FOOTER = "𝔗𝔥𝔢 𝔒𝔩𝔤𝔞𝔰 𝔖𝔢𝔞𝔰𝔬𝔫 5";
const ANNOUNCE_CHANNEL_ID = "1553495305591328888";
const ANNOUNCE_BANNER = "https://cdn.discordapp.com/attachments/1212370536416677949/1555599574167457875/image.png";
const LEADERBOARD_BANNER = "https://cdn.discordapp.com/attachments/1212370536416677949/1555666251773255852/image.png";
const LEVEL_UP_CHANNEL_ID = "1517175386021040138";

// XP / LEVELS
const CHAT_DATA_PATH = "./data/chatLevels.json";
const STATS_DATA_PATH = "./data/stats.json";

const LEVELS = [
  { xp: 0, name: "Rookie socializer" },
  { xp: 200, name: "Settled socializer" },
  { xp: 400, name: "Experienced socializer" },
  { xp: 900, name: "professional socializer" },
  { xp: 1800, name: "Professional Yapper" },
  { xp: 3000, name: "Unstoppable yappinga" },
  { xp: 6000, name: "unreal yapper" },
  { xp: 11000, name: "the king of the chats" },
  { xp: 30000, name: "yappinga final boss" }
];

let chatData = {
  users: {}, // userId: { xp, messagesTotal, messagesWeek }
  lastWeek: null
};

let statsData = {
  leaderboardChannel: null,
  leaderboardMessage: null
};

function ensureDataFolder() {
  if (!fs.existsSync("./data")) {
    fs.mkdirSync("./data");
  }
}

function loadChatData() {
  ensureDataFolder();
  try {
    if (fs.existsSync(CHAT_DATA_PATH)) {
      const raw = fs.readFileSync(CHAT_DATA_PATH, "utf8");
      chatData = JSON.parse(raw);
    }
  } catch (e) {
    console.error("Failed to load chat data:", e);
  }
}

function saveChatData() {
  ensureDataFolder();
  try {
    fs.writeFileSync(CHAT_DATA_PATH, JSON.stringify(chatData, null, 2), "utf8");
  } catch (e) {
    console.error("Failed to save chat data:", e);
  }
}

function loadStatsData() {
  ensureDataFolder();
  try {
    if (fs.existsSync(STATS_DATA_PATH)) {
      const raw = fs.readFileSync(STATS_DATA_PATH, "utf8");
      statsData = JSON.parse(raw);
    }
  } catch (e) {
    console.error("Failed to load stats data:", e);
  }
}

function saveStatsData() {
  ensureDataFolder();
  try {
    fs.writeFileSync(STATS_DATA_PATH, JSON.stringify(statsData, null, 2), "utf8");
  } catch (e) {
    console.error("Failed to save stats data:", e);
  }
}

function getWeekNumber(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
}

function ensureUser(id) {
  if (!chatData.users[id]) {
    chatData.users[id] = {
      xp: 0,
      messagesTotal: 0,
      messagesWeek: 0
    };
  }
  return chatData.users[id];
}

function getLevelIndexFromXp(xp) {
  let idx = 0;
  for (let i = 0; i < LEVELS.length; i++) {
    if (xp >= LEVELS[i].xp) idx = i;
    else break;
  }
  return idx;
}

function getNextLevelInfo(xp) {
  const currentIndex = getLevelIndexFromXp(xp);
  const nextIndex = currentIndex + 1;
  if (nextIndex >= LEVELS.length) return null;
  const nextLevel = LEVELS[nextIndex];
  return {
    name: nextLevel.name,
    xpToNext: nextLevel.xp - xp
  };
}

async function sendLevelUpEmbed(userId, newLevelIndex, xp) {
  const channel = await client.channels.fetch(LEVEL_UP_CHANNEL_ID).catch(() => null);
  if (!channel) return;

  const levelName = LEVELS[newLevelIndex].name;
  const nextInfo = getNextLevelInfo(xp);

  let desc = `-starts fingering- CONGRATS SLUTTY <@${userId}> ! youve leveled up to **${levelName}** ! `;
  if (nextInfo) {
    desc += `Youre **${nextInfo.xpToNext}** XP away from the next level **${nextInfo.name}** , good luck fattie!`;
  } else {
    desc += `You reached the highest level, yappinga final boss, you disgusting chatter freak!`;
  }

  const embed = new EmbedBuilder()
    .setColor(BURGUNDY)
    .setDescription(desc)
    .setFooter({ text: OLGA_FOOTER });

  await channel.send({ embeds: [embed] });
}

function buildWeeklyLeaderboardEmbed() {
  const users = Object.entries(chatData.users);
  users.sort((a, b) => b[1].messagesWeek - a[1].messagesWeek);

  const top3 = users.slice(0, 3);
  let desc = "";

  if (top3.length === 0) {
    desc = "No chatters this week yet.";
  } else {
    top3.forEach(([id, data], index) => {
      desc += `${index + 1}. <@${id}> — **${data.messagesWeek}** msgs this week\n`;
    });
  }

  const embed = new EmbedBuilder()
    .setColor(BURGUNDY)
    .setTitle("💭 Top chatters this week")
    .setDescription(desc)
    .setImage(LEADERBOARD_BANNER)
    .setFooter({ text: OLGA_FOOTER });

  return embed;
}

function buildOverallLeaderboardEmbed() {
  const users = Object.entries(chatData.users);
  users.sort((a, b) => b[1].messagesTotal - a[1].messagesTotal);

  let desc = "";

  if (users.length === 0) {
    desc = "No chatters yet.";
  } else {
    users.forEach(([id, data], index) => {
      desc += `${index + 1}. <@${id}> — **${data.messagesTotal}** msgs total\n`;
    });
  }

  const embed = new EmbedBuilder()
    .setColor(BURGUNDY)
    .setTitle("💭 Top chatters in overall")
    .setDescription(desc)
    .setImage(LEADERBOARD_BANNER)
    .setFooter({ text: OLGA_FOOTER });

  return embed;
}

async function updateLeaderboards() {
  const channelId = statsData.leaderboardChannel;
  if (!channelId) return;

  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel) return;

  const weeklyEmbed = buildWeeklyLeaderboardEmbed();
  const overallEmbed = buildOverallLeaderboardEmbed();

  if (statsData.leaderboardMessage) {
    const msg = await channel.messages.fetch(statsData.leaderboardMessage).catch(() => null);
    if (msg) {
      await msg.edit({ embeds: [weeklyEmbed, overallEmbed] });
      return;
    }
  }

  const newMsg = await channel.send({ embeds: [weeklyEmbed, overallEmbed] });
  statsData.leaderboardMessage = newMsg.id;
  saveStatsData();
}

// READY
client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  loadChatData();
  loadStatsData();

  client.user.setStatus("idle");
  client.user.setActivity("𝕺𝖑𝖌𝖆𝖘𝖒𝟐𝟒' | 𝕾𝖊𝖆𝖘𝖔𝖓 𝟓 📰", {
    type: ActivityType.Playing
  });

  const commands = [
    new SlashCommandBuilder()
      .setName("embed")
      .setDescription("Embed tools")
      .addSubcommand(sub =>
        sub
          .setName("create")
          .setDescription("Create a custom embed")
      ),

      new SlashCommandBuilder()
  .setName("rr")
  .setDescription("Reaction roles system")
  .addSubcommand(sub =>
    sub
      .setName("create")
      .setDescription("Create a reaction roles embed")
  ),


    new SlashCommandBuilder()
      .setName("olgasm")
      .setDescription("Olga utilities")
      .addSubcommand(sub =>
        sub
          .setName("announce")
          .setDescription("Create an Olga announcement embed")
      ),

    new SlashCommandBuilder()
      .setName("setstatus")
      .setDescription("Set bot status")
      .addStringOption(opt =>
        opt
          .setName("status")
          .setDescription("online | idle | dnd | invisible")
          .setRequired(true)
          .addChoices(
            { name: "online", value: "online" },
            { name: "idle", value: "idle" },
            { name: "dnd", value: "dnd" },
            { name: "invisible", value: "invisible" }
          )
      ),

    new SlashCommandBuilder()
      .setName("setactivity")
      .setDescription("Set bot activity")
      .addStringOption(opt =>
        opt
          .setName("type")
          .setDescription("playing | watching | listening | competing")
          .setRequired(true)
          .addChoices(
            { name: "playing", value: "playing" },
            { name: "watching", value: "watching" },
            { name: "listening", value: "listening" },
            { name: "competing", value: "competing" }
          )
      )
      .addStringOption(opt =>
        opt
          .setName("text")
          .setDescription("Activity text")
          .setRequired(true)
      ),

    new SlashCommandBuilder()
      .setName("lb")
      .setDescription("Leaderboards")
      .addSubcommand(sub =>
        sub
          .setName("chat")
          .setDescription("Chatting leaderboard")
      ),

    new SlashCommandBuilder()
      .setName("addxp")
      .setDescription("Add XP to a user")
      .addUserOption(opt =>
        opt
          .setName("user")
          .setDescription("User to add XP to")
          .setRequired(true)
      )
      .addIntegerOption(opt =>
        opt
          .setName("amount")
          .setDescription("Amount of XP to add")
          .setRequired(true)
      ),

    new SlashCommandBuilder()
      .setName("removexp")
      .setDescription("Remove XP from a user")
      .addUserOption(opt =>
        opt
          .setName("user")
          .setDescription("User to remove XP from")
          .setRequired(true)
      )
      .addIntegerOption(opt =>
        opt
          .setName("amount")
          .setDescription("Amount of XP to remove")
          .setRequired(true)
      ),

    new SlashCommandBuilder()
      .setName("statsch")
      .setDescription("Set stats/leaderboard channel")
      .addSubcommand(sub =>
        sub
          .setName("set")
          .setDescription("Set the stats channel")
          .addChannelOption(opt =>
            opt
              .setName("channel")
              .setDescription("Channel to use for stats leaderboards")
              .setRequired(true)
          )
      )
  ].map(c => c.toJSON());

  await client.application.commands.set(commands);
  console.log("Slash commands registered.");

  setInterval(updateLeaderboards, 5 * 60 * 1000);
});

// MESSAGE HANDLER (XP + LEVELS)
client.on("messageCreate", async (msg) => {
  if (!msg.guild || msg.author.bot) return;

  const now = new Date();
  const currentWeek = getWeekNumber(now);
  if (chatData.lastWeek === null) {
    chatData.lastWeek = currentWeek;
  } else if (chatData.lastWeek !== currentWeek) {
    for (const id in chatData.users) {
      chatData.users[id].messagesWeek = 0;
    }
    chatData.lastWeek = currentWeek;
  }

  const userId = msg.author.id;
  const userData = ensureUser(userId);

  const oldXp = userData.xp;
  const oldLevelIndex = getLevelIndexFromXp(oldXp);

  userData.messagesTotal += 1;
  userData.messagesWeek += 1;

  const hasAttachment = msg.attachments.size > 0;
  const xpGain = hasAttachment ? 4 : 2;
  userData.xp += xpGain;

  saveChatData();

  const newLevelIndex = getLevelIndexFromXp(userData.xp);
  if (newLevelIndex > oldLevelIndex) {
    await sendLevelUpEmbed(userId, newLevelIndex, userData.xp);
  }
});

// INTERACTIONS
client.on("interactionCreate", async (interaction) => {
  if (interaction.isChatInputCommand()) {
    const name = interaction.commandName;

// BUTTON HANDLER (Reaction Roles)
if (interaction.isButton()) {
  if (interaction.customId.startsWith("rr_")) {
  const roleId = interaction.customId.replace("rr_", "");
  const role = interaction.guild.roles.cache.get(roleId);

  if (!role) {
    return interaction.reply({ content: "Role not found.", ephemeral: true });
  }

  const member = interaction.member;

  if (member.roles.cache.has(roleId)) {
    await member.roles.remove(roleId);
    return interaction.reply({ content: `Removed role **${role.name}**`, ephemeral: true });
  } else {
    await member.roles.add(roleId);
    return interaction.reply({ content: `Added role **${role.name}**`, ephemeral: true });
  }
}

  if (interaction.customId.startsWith("rr_")) {
    const roleId = interaction.customId.replace("rr_", "");
    const role = interaction.guild.roles.cache.get(roleId);

    if (!role) {
      return interaction.reply({ content: "Role not found.", ephemeral: true });
    }

    const member = interaction.member;

    // Toggle role
    if (member.roles.cache.has(roleId)) {
      await member.roles.remove(roleId);
      return interaction.reply({
        content: `Removed role **${role.name}**`,
        ephemeral: true
      });
    } else {
      await member.roles.add(roleId);
      return interaction.reply({
        content: `Added role **${role.name}**`,
        ephemeral: true
      });
    }
  }
}


// /rr create
if (name === "rr") {
  if (interaction.options.getSubcommand() === "create") {
    if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: "You are not allowed to use this command.", ephemeral: true });
    }

    const modal = new ModalBuilder()
      .setCustomId("rr_create_modal")
      .setTitle("Create Reaction Roles");

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("description")
          .setLabel("Embed description")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("emoji1")
          .setLabel("Emoji 1")
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("role1")
          .setLabel("Role name 1")
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("emoji2")
          .setLabel("Emoji 2")
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("role2")
          .setLabel("Role name 2")
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("emoji3")
          .setLabel("Emoji 3")
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("role3")
          .setLabel("Role name 3")
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("emoji4")
          .setLabel("Emoji 4")
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("role4")
          .setLabel("Role name 4")
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("emoji5")
          .setLabel("Emoji 5")
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("role5")
          .setLabel("Role name 5")
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
      )
    );

    return interaction.showModal(modal);
  }
}


    // /embed create
    if (name === "embed") {
      if (interaction.options.getSubcommand() === "create") {
        const modal = new ModalBuilder()
          .setCustomId("embed_create_modal")
          .setTitle("Create Custom Embed");

        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("title")
              .setLabel("Title (optional)")
              .setStyle(TextInputStyle.Short)
              .setRequired(false)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("description")
              .setLabel("Description (required)")
              .setStyle(TextInputStyle.Paragraph)
              .setRequired(true)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("text")
              .setLabel("Extra text (optional)")
              .setStyle(TextInputStyle.Paragraph)
              .setRequired(false)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("thumbnail")
              .setLabel("Thumbnail URL (optional)")
              .setStyle(TextInputStyle.Short)
              .setRequired(false)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("image")
              .setLabel("Image URL (optional)")
              .setStyle(TextInputStyle.Short)
              .setRequired(false)
          )
        );

        return interaction.showModal(modal);
      }
    }

    // /olgasm announce
    if (name === "olgasm") {
      if (interaction.options.getSubcommand() === "announce") {
        const modal = new ModalBuilder()
          .setCustomId("olgasm_announce_modal")
          .setTitle("Olga Announcement");

        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("description")
              .setLabel("Announcement description")
              .setStyle(TextInputStyle.Paragraph)
              .setRequired(true)
          )
        );

        return interaction.showModal(modal);
      }
    }

    // /setstatus
    if (name === "setstatus") {
      const status = interaction.options.getString("status");
      client.user.setStatus(status);
      return interaction.reply({ content: `Status set to ${status}`, ephemeral: true });
    }

    // /setactivity
    if (name === "setactivity") {
      const type = interaction.options.getString("type");
      const text = interaction.options.getString("text");

      const types = {
        playing: ActivityType.Playing,
        watching: ActivityType.Watching,
        listening: ActivityType.Listening,
        competing: ActivityType.Competing
      };

      client.user.setActivity(text, { type: types[type] });
      return interaction.reply({ content: `Activity set to ${type} ${text}`, ephemeral: true });
    }

    // /lb chat
    if (name === "lb") {
      if (interaction.options.getSubcommand() === "chat") {
        const users = Object.entries(chatData.users);
        users.sort((a, b) => b[1].messagesTotal - a[1].messagesTotal);

        let desc = "";

        if (users.length === 0) {
          desc = "No chatters yet.";
        } else {
          users.forEach(([id, data], index) => {
            const levelIndex = getLevelIndexFromXp(data.xp);
            const levelName = LEVELS[levelIndex].name;
            const nextInfo = getNextLevelInfo(data.xp);
            const xpToNext = nextInfo ? nextInfo.xpToNext : 0;

            desc += `${index + 1}. <@${id}> — **${data.messagesTotal}** msgs, **${data.xp}** XP, level: **${levelName}**`;
            if (nextInfo) {
              desc += `, **${xpToNext}** XP until **${nextInfo.name}**`;
            } else {
              desc += `, at max level`;
            }
            desc += `\n`;
          });
        }

        const embed = new EmbedBuilder()
          .setColor(BURGUNDY)
          .setTitle("💭 Chatting leaderboard")
          .setDescription(desc)
          .setImage(LEADERBOARD_BANNER)
          .setFooter({ text: OLGA_FOOTER });

        return interaction.reply({ embeds: [embed] });
      }
    }

    // /addxp
    if (name === "addxp") {
      if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: "You are not allowed to use this command.", ephemeral: true });
      }

      const user = interaction.options.getUser("user", true);
      const amount = interaction.options.getInteger("amount", true);

      const data = ensureUser(user.id);
      const oldLevelIndex = getLevelIndexFromXp(data.xp);

      data.xp += amount;
      if (data.xp < 0) data.xp = 0;

      saveChatData();

      const newLevelIndex = getLevelIndexFromXp(data.xp);
      if (newLevelIndex > oldLevelIndex) {
        await sendLevelUpEmbed(user.id, newLevelIndex, data.xp);
      }

      return interaction.reply({
        content: `Added **${amount}** XP to <@${user.id}>. They now have **${data.xp}** XP.`,
        ephemeral: true
      });
    }

    // /removexp
    if (name === "removexp") {
      if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: "You are not allowed to use this command.", ephemeral: true });
      }

      const user = interaction.options.getUser("user", true);
      const amount = interaction.options.getInteger("amount", true);

      const data = ensureUser(user.id);

      data.xp -= amount;
      if (data.xp < 0) data.xp = 0;

      saveChatData();

      return interaction.reply({
        content: `Removed **${amount}** XP from <@${user.id}>. They now have **${data.xp}** XP.`,
        ephemeral: true
      });
    }

    // /statsch set
    if (name === "statsch") {
      if (interaction.options.getSubcommand() === "set") {
        if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
          return interaction.reply({ content: "You are not allowed to use this command.", ephemeral: true });
        }

        const channel = interaction.options.getChannel("channel", true);
        statsData.leaderboardChannel = channel.id;
        statsData.leaderboardMessage = null;
        saveStatsData();

        return interaction.reply({
          content: `Stats/leaderboard channel set to ${channel}. Leaderboard will update every 5 minutes.`,
          ephemeral: true
        });
      }
    }
  }

  // MODALS
  if (interaction.isModalSubmit()) {
    if (interaction.customId === "embed_create_modal") {
      const title = interaction.fields.getTextInputValue("title");
      const description = interaction.fields.getTextInputValue("description");
      const text = interaction.fields.getTextInputValue("text");
      const thumbnail = interaction.fields.getTextInputValue("thumbnail");
      const image = interaction.fields.getTextInputValue("image");

      const embed = new EmbedBuilder()
        .setColor(AZURITE_BLUE)
        .setDescription(description)
        .setFooter({ text: OLGA_FOOTER });

      if (title) embed.setTitle(title);
      if (thumbnail) embed.setThumbnail(thumbnail);
      if (image) embed.setImage(image);
      if (text) embed.addFields({ name: "Text", value: text });

      await interaction.channel.send({ embeds: [embed] });

      return interaction.reply({ content: "Embed sent.", ephemeral: true });
    }

if (interaction.customId === "rr_create_modal") {
  const description = interaction.fields.getTextInputValue("description");

  const pairs = [];
  for (let i = 1; i <= 5; i++) {
    const emoji = interaction.fields.getTextInputValue(`emoji${i}`);
    const roleName = interaction.fields.getTextInputValue(`role${i}`);

    if (emoji && roleName) {
      const role = interaction.guild.roles.cache.find(r => r.name.toLowerCase() === roleName.toLowerCase());
      if (role) {
        pairs.push({ emoji, roleId: role.id });
      }
    }
  }

  if (pairs.length === 0) {
    return interaction.reply({ content: "No valid emoji/role pairs provided.", ephemeral: true });
  }

  const embed = new EmbedBuilder()
    .setColor(BURGUNDY)
    .setTitle(".·:*¨¨* ≈Reaction Roles≈ *¨¨*:·.")
    .setDescription(description)
    .setImage("https://cdn.discordapp.com/attachments/1212370536416677949/1556038451646828655/image.png")
    .setFooter({ text: OLGA_FOOTER });

  const row = new ActionRowBuilder();

  pairs.forEach(pair => {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`rr_${pair.roleId}`)
        .setEmoji(pair.emoji)
        .setStyle(2) // Secondary
    );
  });

  await interaction.channel.send({ embeds: [embed], components: [row] });

  return interaction.reply({ content: "Reaction roles created.", ephemeral: true });
}


    if (interaction.customId === "olgasm_announce_modal") {
      const description = interaction.fields.getTextInputValue("description");

      const embed = new EmbedBuilder()
        .setColor(BURGUNDY)
        .setTitle("📰 OLGASM 24' NEWS")
        .setDescription(description)
        .setImage(ANNOUNCE_BANNER)
        .setFooter({ text: OLGA_FOOTER });

      const channel = await client.channels.fetch(ANNOUNCE_CHANNEL_ID).catch(() => null);
      if (channel) {
        await channel.send({ embeds: [embed] });
      }

      return interaction.reply({
        content: `Announcement sent to <#${ANNOUNCE_CHANNEL_ID}>`,
        ephemeral: true
      });
    }
  }
});

client.login(process.env.TOKEN);
