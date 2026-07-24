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
  EmbedBuilder
} = require("discord.js");

const PREFIX = "h!";

// PREFIX COMMAND HANDLER
client.on("messageCreate", async (msg) => {
  if (!msg.content.startsWith(PREFIX)) return;

  const args = msg.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  // ANNOUNCEMENT COMMAND
  if (command === "announcement") {

    await msg.channel.send("opening announcement shit bitch");
    await msg.channel.send("loading modal bitch");
    await msg.channel.send("dont be slow bitch");

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

    await msg.channel.send("sending modal bitch");
    await msg.channel.send("modal should appear bitch");

    await msg.channel.send("fill it out bitch");

    await msg.channel.send("waiting for your dumb input bitch");

    await msg.channel.send("ok bitch");
  }
});

// HANDLE MODAL SUBMISSION
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isModalSubmit()) return;

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
});


client.login(process.env.TOKEN);
