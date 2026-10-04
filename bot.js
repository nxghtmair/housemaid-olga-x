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
  PermissionFlagsBits,
  ButtonBuilder,
  ButtonStyle
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
const REACTION_ROLES_BANNER = "https://cdn.discordapp.com/attachments/1212370536416677949/1556038451646828655/image.png";
const COUNTING_CHANNEL_ID = "1515690705664741466";

// DATA PATHS
const CHAT_DATA_PATH = "./data/chatLevels.json";
const STATS_DATA_PATH = "./data/stats.json";

let chatData = { users: {}, lastWeek: null };
let statsData = { leaderboardChannel: null, leaderboardMessage: null };

// COUNTING GAME STATE
let countingState = { lastNumber: 0, lastUserId: null };

// GUESSING GAME
const GUESS_ITEMS = [
  { answer: "cat", hints: ["It’s a small furry animal that loves to ignore you.", "It often knocks things off tables for fun."] },
  { answer: "pizza", hints: ["It’s round, cheesy, and often delivered in a box.", "People argue about pineapple on it."] },
  { answer: "phone", hints: ["You stare at it way too much every day.", "It fits in your hand and connects you to everyone."] },
  { answer: "car", hints: ["It has four wheels and takes you places.", "You sit inside it and complain about traffic."] },
  { answer: "bed", hints: ["You visit it every night.", "It’s where you pretend you’ll sleep early but don’t."] }
];

let guessState = { currentIndex: null, hintIndex: 0, lastHintMessageId: null };

// ROAST MODE
let roastModeOn = false;
let roastInterval = null;
let roastChannelId = null;

const ROASTS = [
  "your body screams help, go lift, bitch.",
  "you look like a before picture, start working on the after.",
  "your fat has more commitment than you ever had to the gym.",
  "the scale is tired of your bullshit, go touch some dumbbells.",
  "your reflection is begging you to discover cardio.",
  "your stomach enters the room five seconds before you do.",
  "you don’t need a mirror, you need a treadmill.",
  "your hoodie is not oversized, it’s just honest.",
  "your body is a cry for help, not a fashion statement.",
  "you’re one snack away from becoming a cautionary tale."
];

function ensureDataFolder() {
  if (!fs.existsSync("./data")) fs.mkdirSync("./data");
}

function loadChatData() {
  ensureDataFolder();
  try {
    if (fs.existsSync(CHAT_DATA_PATH)) {
      chatData = JSON.parse(fs.readFileSync(CHAT_DATA_PATH, "utf8"));
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
      statsData = JSON.parse(fs.readFileSync(STATS_DATA_PATH, "utf8"));
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
  if (!chatData.users[id]) chatData.users[id] = { messagesTotal: 0, messagesWeek: 0 };
  return chatData.users[id];
}

function buildWeeklyLeaderboardEmbed() {
  const users = Object.entries(chatData.users).sort((a, b) => b[1].messagesWeek - a[1].messagesWeek);
  let desc = users.length === 0 ? "No chatters this week yet." : users.map(
    ([id, data], i) => `${i + 1}. <@${id}> — **${data.messagesWeek}** msgs this week`
  ).join("\n");

  return new EmbedBuilder()
    .setColor(BURGUNDY)
    .setTitle("💭 Top chatters this week")
    .setDescription(desc)
    .setImage(LEADERBOARD_BANNER)
    .setFooter({ text: OLGA_FOOTER });
}

function buildOverallLeaderboardEmbed() {
  const users = Object.entries(chatData.users).sort((a, b) => b[1].messagesTotal - a[1].messagesTotal);
  let desc = users.length === 0 ? "No chatters yet." : users.map(
    ([id, data], i) => `${i + 1}. <@${id}> — **${data.messagesTotal}** msgs total`
  ).join("\n");

  return new EmbedBuilder()
    .setColor(BURGUNDY)
    .setTitle("💭 Top chatters in overall")
    .setDescription(desc)
    .setImage(LEADERBOARD_BANNER)
    .setFooter({ text: OLGA_FOOTER });
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

// GUESSING GAME HELPERS
function startGuessingGame(channel) {
  const index = Math.floor(Math.random() * GUESS_ITEMS.length);
  guessState.currentIndex = index;
  guessState.hintIndex = 0;
  const item = GUESS_ITEMS[index];
  return channel.send(item.hints[0]).then(msg => {
    guessState.lastHintMessageId = msg.id;
  });
}

function endGuessingGame() {
  guessState.currentIndex = null;
  guessState.hintIndex = 0;
  guessState.lastHintMessageId = null;
}

function getCurrentGuessItem() {
  if (guessState.currentIndex === null) return null;
  return GUESS_ITEMS[guessState.currentIndex];
}

// ROAST MODE
async function startRoastMode() {
  if (roastModeOn || !roastChannelId) return;
  roastModeOn = true;

  roastInterval = setInterval(async () => {
    try {
      const userIds = Object.keys(chatData.users);
      if (userIds.length === 0) return;

      const randomUserId = userIds[Math.floor(Math.random() * userIds.length)];
      const randomRoast = ROASTS[Math.floor(Math.random() * ROASTS.length)];
      const channel = await client.channels.fetch(roastChannelId).catch(() => null);
      if (!channel) return;

      const embed = new EmbedBuilder()
        .setColor(BURGUNDY)
        .setDescription(randomRoast)
        .setFooter({ text: OLGA_FOOTER });

      await channel.send({ content: `<@${randomUserId}>`, embeds: [embed] });
    } catch (e) {
      console.error("Roast mode error:", e);
    }
  }, 2 * 60 * 1000);
}

function stopRoastMode() {
  roastModeOn = false;
  if (roastInterval) {
    clearInterval(roastInterval);
    roastInterval = null;
  }
}

// READY
client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  loadChatData();
  loadStatsData();

  client.user.setStatus("idle");
  client.user.setActivity(" 🎃👻Olgasm V5: Season 5", { type: ActivityType.Playing });

  const commands = [
    new SlashCommandBuilder()
      .setName("embed")
      .setDescription("Embed tools")
      .addSubcommand(sub => sub.setName("create").setDescription("Create a custom embed")),

    new SlashCommandBuilder()
      .setName("olgasm")
      .setDescription("Olga utilities")
      .addSubcommand(sub => sub.setName("announce").setDescription("Create an Olga announcement embed")),

    new SlashCommandBuilder()
      .setName("setstatus")
      .setDescription("Set bot status")
      .addStringOption(opt =>
        opt.setName("status").setDescription("online | idle | dnd | invisible").setRequired(true).addChoices(
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
        opt.setName("type").setDescription("playing | watching | listening | competing").setRequired(true).addChoices(
          { name: "playing", value: "playing" },
          { name: "watching", value: "watching" },
          { name: "listening", value: "listening" },
          { name: "competing", value: "competing" }
        )
      )
      .addStringOption(opt =>
        opt.setName("text").setDescription("Activity text").setRequired(true)
      ),

    new SlashCommandBuilder()
      .setName("lb")
      .setDescription("Leaderboards")
      .addSubcommand(sub => sub.setName("chat").setDescription("Chatting leaderboard")),

    new SlashCommandBuilder()
      .setName("statsch")
      .setDescription("Set stats/leaderboard channel")
      .addSubcommand(sub =>
        sub.setName("set").setDescription("Set the stats channel").addChannelOption(opt =>
          opt.setName("channel").setDescription("Channel to use for stats leaderboards").setRequired(true)
        )
      ),

    new SlashCommandBuilder()
      .setName("rr")
      .setDescription("Reaction roles system")
      .addSubcommand(sub =>
        sub.setName("create").setDescription("Create the Olga reaction roles embed")
      ),

    new SlashCommandBuilder()
      .setName("guessit")
      .setDescription("Guessing game")
      .addSubcommand(sub => sub.setName("start").setDescription("Start the guessing game"))
      .addSubcommand(sub => sub.setName("end").setDescription("End the guessing game")),

    new SlashCommandBuilder()
      .setName("roastmode")
      .setDescription("Toggle roast mode")
      .addStringOption(opt =>
        opt.setName("mode").setDescription("on or off").setRequired(true).addChoices(
          { name: "on", value: "on" },
          { name: "off", value: "off" }
        )
      ),

    new SlashCommandBuilder()
      .setName("poll")
      .setDescription("Create polls")
      .addSubcommand(sub => sub.setName("create").setDescription("Create a poll"))
  ].map(c => c.toJSON());

  await client.application.commands.set(commands);
  console.log("Slash commands registered.");

  setInterval(updateLeaderboards, 5 * 60 * 1000);
});

// MESSAGE HANDLER
client.on("messageCreate", async (msg) => {
  if (!msg.guild || msg.author.bot) return;

  // WEEKLY RESET
  const now = new Date();
  const currentWeek = getWeekNumber(now);
  if (chatData.lastWeek === null) {
    chatData.lastWeek = currentWeek;
  } else if (chatData.lastWeek !== currentWeek) {
    for (const id in chatData.users) chatData.users[id].messagesWeek = 0;
    chatData.lastWeek = currentWeek;
    saveChatData();
  }

  // COUNT TOTAL + WEEKLY MESSAGES
  const userId = msg.author.id;
  const userData = ensureUser(userId);
  userData.messagesTotal += 1;
  userData.messagesWeek += 1;
  saveChatData();

  // COUNTING GAME
  if (msg.channel.id === COUNTING_CHANNEL_ID) {
    const num = parseInt(msg.content.trim(), 10);
    if (isNaN(num)) return;

    const correctEmoji = "1556263477969166436";
    const wrongEmoji = "1556263655392280576";

    if (countingState.lastUserId === msg.author.id) {
      await msg.react(wrongEmoji);
      const ruinedAt = countingState.lastNumber === 0 ? "0" : countingState.lastNumber;
      const embed = new EmbedBuilder()
        .setColor(BURGUNDY)
        .setDescription(`stupid <@${msg.author.id}> messed up at **${ruinedAt}** , what a dumb bitch!`)
        .setFooter({ text: OLGA_FOOTER });
      await msg.channel.send({ embeds: [embed] });
      countingState.lastNumber = 0;
      countingState.lastUserId = null;
      return;
    }

    if (countingState.lastNumber !== 0 && num !== countingState.lastNumber + 1) {
      await msg.react(wrongEmoji);
      const ruinedAt = countingState.lastNumber;
      const embed = new EmbedBuilder()
        .setColor(BURGUNDY)
        .setDescription(`stupid <@${msg.author.id}> messed up at **${ruinedAt}** , what a dumb bitch!`)
        .setFooter({ text: OLGA_FOOTER });
      await msg.channel.send({ embeds: [embed] });
      countingState.lastNumber = 0;
      countingState.lastUserId = null;
      return;
    }

    await msg.react(correctEmoji);
    countingState.lastNumber = num;
    countingState.lastUserId = msg.author.id;
  }

  // GUESSING GAME replies
  if (guessState.currentIndex !== null && msg.reference && msg.reference.messageId) {
    if (msg.reference.messageId === guessState.lastHintMessageId) {
      const item = getCurrentGuessItem();
      if (!item) return;
      const guess = msg.content.trim().toLowerCase();
      const answer = item.answer.toLowerCase();

      if (guess === answer) {
        const embed = new EmbedBuilder()
          .setColor(BURGUNDY)
          .setDescription(`fat bitch <@${msg.author.id}> guessed the thing! the thing was **${item.answer}**`)
          .setFooter({ text: OLGA_FOOTER });
        await msg.channel.send({ embeds: [embed] });
        await startGuessingGame(msg.channel);
      } else {
        const item2 = getCurrentGuessItem();
        if (!item2) return;
        guessState.hintIndex++;
        if (guessState.hintIndex >= item2.hints.length) guessState.hintIndex = item2.hints.length - 1;
        const hint = item2.hints[guessState.hintIndex];
        const newMsg = await msg.channel.send(hint);
        guessState.lastHintMessageId = newMsg.id;
      }
    }
  }
});

// INTERACTIONS
client.on("interactionCreate", async (interaction) => {
  // SLASH COMMANDS
  if (interaction.isChatInputCommand()) {
    const name = interaction.commandName;

    // /embed create
    if (name === "embed" && interaction.options.getSubcommand() === "create") {
      const modal = new ModalBuilder()
        .setCustomId("embed_create_modal")
        .setTitle("Create Custom Embed");

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("title").setLabel("Title (optional)").setStyle(TextInputStyle.Short).setRequired(false)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("description").setLabel("Description (required)").setStyle(TextInputStyle.Paragraph).setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("text").setLabel("Extra text (optional)").setStyle(TextInputStyle.Paragraph).setRequired(false)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("thumbnail").setLabel("Thumbnail URL (optional)").setStyle(TextInputStyle.Short).setRequired(false)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("image").setLabel("Image URL (optional)").setStyle(TextInputStyle.Short).setRequired(false)
        )
      );

      return interaction.showModal(modal);
    }

    // /olgasm announce
    if (name === "olgasm" && interaction.options.getSubcommand() === "announce") {
      const modal = new ModalBuilder()
        .setCustomId("olgasm_announce_modal")
        .setTitle("Olga Announcement");

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("description").setLabel("Announcement description").setStyle(TextInputStyle.Paragraph).setRequired(true)
        )
      );

      return interaction.showModal(modal);
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
    if (name === "lb" && interaction.options.getSubcommand() === "chat") {
      const users = Object.entries(chatData.users).sort((a, b) => b[1].messagesTotal - a[1].messagesTotal);
      let desc = users.length === 0 ? "No chatters yet." : users.map(
        ([id, data], i) => `${i + 1}. <@${id}> — **${data.messagesTotal}** msgs total, **${data.messagesWeek}** msgs this week`
      ).join("\n");

      const embed = new EmbedBuilder()
        .setColor(BURGUNDY)
        .setTitle("💭 Chatting leaderboard")
        .setDescription(desc)
        .setImage(LEADERBOARD_BANNER)
        .setFooter({ text: OLGA_FOOTER });

      return interaction.reply({ embeds: [embed] });
    }

    // /statsch set
    if (name === "statsch" && interaction.options.getSubcommand() === "set") {
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

    // /rr create — fixed Olga reaction roles embed
    if (name === "rr" && interaction.options.getSubcommand() === "create") {
      if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: "You are not allowed to use this command.", ephemeral: true });
      }

      const description =
        "- 🏚️would you like to engage with the house, be notified ab incoming events, gossip etc.? well, u r at the right spot, bitch.\n\n" +
        "📣 <@&1556036642777596024>\n" +
        "📺 <@&1556036938392150126>\n" +
        "😈 <@&1556036823879524352>\n" +
        "🏚️ <@&1556036256746704951>\n" +
        "👻 <@&1556036171635753040>\n" +
        "💭 <@&1556036057839968397>\n" +
        "📩 <@&1556036642777596024>\n" +
        "📲 <@&1556035954744229931>\n" +
        "❓ <@&1556036589908529266>\n" +
        "👏 <@&1556036346546487436>";

      const embed = new EmbedBuilder()
        .setColor(BURGUNDY)
        .setTitle(" ≡;- ꒰ °Reaction roles ꒱ ")
        .setDescription(description)
        .setImage(REACTION_ROLES_BANNER)
        .setFooter({ text: OLGA_FOOTER });

      const mapping = [
        { emoji: "📣", roleId: "1556036642777596024" },
        { emoji: "📺", roleId: "1556036938392150126" },
        { emoji: "😈", roleId: "1556036823879524352" },
        { emoji: "🏚️", roleId: "1556036256746704951" },
        { emoji: "👻", roleId: "1556036171635753040" },
        { emoji: "💭", roleId: "1556036057839968397" },
        { emoji: "📩", roleId: "1556036642777596024" },
        { emoji: "📲", roleId: "1556035954744229931" },
        { emoji: "❓", roleId: "1556036589908529266" },
        { emoji: "👏", roleId: "1556036346546487436" }
      ];

      const rows = [];
      let currentRow = new ActionRowBuilder();

      mapping.forEach((item, index) => {
        if (index > 0 && index % 5 === 0) {
          rows.push(currentRow);
          currentRow = new ActionRowBuilder();
        }

        currentRow.addComponents(
          new ButtonBuilder()
            .setCustomId(`rr_${item.roleId}_${index}`)
            .setEmoji(item.emoji)
            .setStyle(ButtonStyle.Secondary)
        );
      });

      if (currentRow.components.length > 0) rows.push(currentRow);

      await interaction.channel.send({ embeds: [embed], components: rows });
      return interaction.reply({ content: "Reaction roles embed created.", ephemeral: true });
    }

    // /guessit
    if (name === "guessit") {
      if (interaction.options.getSubcommand() === "start") {
        await startGuessingGame(interaction.channel);
        return interaction.reply({ content: "Guessing game started. Reply to my messages to guess.", ephemeral: true });
      }
      if (interaction.options.getSubcommand() === "end") {
        endGuessingGame();
        return interaction.reply({ content: "Guessing game ended.", ephemeral: true });
      }
    }

    // /roastmode
    if (name === "roastmode") {
      const mode = interaction.options.getString("mode");
      if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: "You are not allowed to use this command.", ephemeral: true });
      }
      roastChannelId = interaction.channel.id;
      if (mode === "on") {
        await startRoastMode();
        return interaction.reply({ content: "Roast mode turned ON. Enjoy the pain.", ephemeral: true });
      } else {
        stopRoastMode();
        return interaction.reply({ content: "Roast mode turned OFF. You’re safe… for now.", ephemeral: true });
      }
    }

    // /poll create
    if (name === "poll" && interaction.options.getSubcommand() === "create") {
      const modal = new ModalBuilder()
        .setCustomId("poll_create_modal")
        .setTitle("Create Olgaistic Poll");

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("option1").setLabel("Option 1 (required)").setStyle(TextInputStyle.Short).setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("option2").setLabel("Option 2 (required)").setStyle(TextInputStyle.Short).setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("option3").setLabel("Option 3 (optional)").setStyle(TextInputStyle.Short).setRequired(false)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("option4").setLabel("Option 4 (optional)").setStyle(TextInputStyle.Short).setRequired(false)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("option5").setLabel("Option 5 (optional)").setStyle(TextInputStyle.Short).setRequired(false)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("option6").setLabel("Option 6 (optional)").setStyle(TextInputStyle.Short).setRequired(false)
        )
      );

      return interaction.showModal(modal);
    }
  }

  // MODALS
  if (interaction.isModalSubmit()) {
    // embed create
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

    // olgasm announce
    if (interaction.customId === "olgasm_announce_modal") {
      const description = interaction.fields.getTextInputValue("description");
      const embed = new EmbedBuilder()
        .setColor(BURGUNDY)
        .setTitle("📰 OLGASM 24' NEWS")
        .setDescription(description)
        .setImage(ANNOUNCE_BANNER)
        .setFooter({ text: OLGA_FOOTER });

      const channel = await client.channels.fetch(ANNOUNCE_CHANNEL_ID).catch(() => null);
      if (channel) await channel.send({ embeds: [embed] });

      return interaction.reply({ content: `Announcement sent to <#${ANNOUNCE_CHANNEL_ID}>`, ephemeral: true });
    }

    // poll create
    if (interaction.customId === "poll_create_modal") {
      const option1 = interaction.fields.getTextInputValue("option1");
      const option2 = interaction.fields.getTextInputValue("option2");
      const option3 = interaction.fields.getTextInputValue("option3");
      const option4 = interaction.fields.getTextInputValue("option4");
      const option5 = interaction.fields.getTextInputValue("option5");
      const option6 = interaction.fields.getTextInputValue("option6");

      const options = [option1, option2, option3, option4, option5, option6].filter(o => o && o.trim().length > 0);
      const emojis = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣"];

      let desc = options.map((opt, i) => `${emojis[i]} ${opt}`).join("\n");

      const embed = new EmbedBuilder()
        .setColor(BURGUNDY)
        .setTitle("❓Olgaistic Poll")
        .setDescription(desc)
        .setFooter({ text: OLGA_FOOTER });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("poll_creator_info")
          .setLabel(`📲Poll creator: ${interaction.user.tag}`)
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true)
      );

      const pollMsg = await interaction.channel.send({ embeds: [embed], components: [row] });
      for (let i = 0; i < options.length; i++) await pollMsg.react(emojis[i]);

      return interaction.reply({ content: "Poll created.", ephemeral: true });
    }
  }

  // BUTTONS
  if (interaction.isButton()) {
    // Reaction roles buttons
    if (interaction.customId.startsWith("rr_")) {
      const parts = interaction.customId.split("_");
      const roleId = parts[1];
      const role = interaction.guild.roles.cache.get(roleId);
      if (!role) return interaction.reply({ content: "Role not found.", ephemeral: true });

      const member = interaction.member;
      if (member.roles.cache.has(roleId)) {
        await member.roles.remove(roleId);
        return interaction.reply({ content: `Removed role **${role.name}**`, ephemeral: true });
      } else {
        await member.roles.add(roleId);
        return interaction.reply({ content: `Added role **${role.name}**`, ephemeral: true });
      }
    }

    // Poll creator info button (do nothing, just disabled)
    if (interaction.customId === "poll_creator_info") {
      return interaction.reply({ content: "This button only shows who created the poll.", ephemeral: true });
    }
  }
});

client.login(process.env.TOKEN);
