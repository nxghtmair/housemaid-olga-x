// Debug logy – aby Render konečně ukázal chybu
process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT ERROR:", err);
});

process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED PROMISE:", err);
});

console.log("Bot.js se spustil, pokouším se přihlásit...");

const { Client, GatewayIntentBits } = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);

  client.user.setPresence({
    status: "dnd", // červené kolečko
    activities: [
      {
        name: "⇢ ˗ˏˋ Olga family: Season 4 ࿐ྂ",
        type: 0 // Playing
      }
    ]
  });
});



client.on("messageCreate", (msg) => {
  if (msg.content === "!ping") {
    msg.reply("pong");
  }
});
const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

const PREFIX = "h!";

// PREFIX COMMAND HANDLER
client.on("messageCreate", async (msg) => {
  if (!msg.content.startsWith(PREFIX)) return;

  const args = msg.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  // ANNOUNCEMENT COMMAND
  if (command === "announcement") {

    // toxic maid message
    await msg.channel.send("opening modal bitch");

    // create button
    const btn = new ButtonBuilder()
      .setCustomId("openAnnouncementModal")
      .setLabel("open announcement modal bitch")
      .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder().addComponents(btn);

    await msg.channel.send({
      content: "click the button bitch",
      components: [row]
    });
  }
});

// HANDLE BUTTON + MODAL
client.on("interactionCreate", async (interaction) => {

  // BUTTON CLICK
  if (interaction.isButton()) {
    if (interaction.customId === "openAnnouncementModal") {

      const modal = new ModalBuilder()
        .setCustomId("announcementModal")
        .setTitle("announcement bitch");

      const titleInput = new TextInputBuilder()
        .setCustomId("announcementTitle")
        .setLabel("title bitch")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const descInput = new TextInputBuilder()
        .setCustomId("announcementDescription")
        .setLabel("description bitch")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      const row1 = new ActionRowBuilder().addComponents(titleInput);
      const row2 = new ActionRowBuilder().addComponents(descInput);

      modal.addComponents(row1, row2);

      await interaction.showModal(modal);
    }
  }

  // MODAL SUBMISSION
  if (interaction.isModalSubmit()) {
    if (interaction.customId === "announcementModal") {

      const title = interaction.fields.getTextInputValue("announcementTitle");
      const description = interaction.fields.getTextInputValue("announcementDescription");

      const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor("#ED0000")
        .setFooter({ text: ".·:*¨¨* ≈Olga family: Season 4≈ *¨¨*:·." });

      const channel = interaction.client.channels.cache.get("1513932745854816356");

      await channel.send({
        content: "@everyone",
        embeds: [embed]
      });

      await interaction.reply({
        content: "announcement sent bitch",
        ephemeral: true
      });
    }
  }
});



client.login(process.env.TOKEN);
