const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActivityType,
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder
} = require("discord.js");
require("dotenv").config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// CONSTANTS
const AZURITE_BLUE = "#007FFF"; // normal embed color
const BURGUNDY = "#800020"; // olgasm announce color
const OLGA_FOOTER = "𝔗𝔥𝔢 𝔒𝔩𝔤𝔞𝔰: 𝔖𝔢𝔞𝔰𝔬𝔫 5";
const ANNOUNCE_CHANNEL_ID = "1553495305591328888";

// ---------------------------------------------
// BOT STATUS + ACTIVITY (EDIT THESE YOURSELF)
// ---------------------------------------------
client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  // Set bot status directly in code
  client.user.setStatus("idle"); 
  // options: "online", "idle", "dnd", "invisible"

  // Set bot activity directly in code
  client.user.setActivity("𝕺𝖑𝖌𝖆𝖘𝖒𝟐𝟒' | 𝕾𝖊𝖆𝖘𝖔𝖓 𝟓 📰", {
    type: ActivityType.Playing
  });
  // types: ActivityType.Playing, Watching, Listening, Competing

  // ---------------------------------------------
  // REGISTER SLASH COMMANDS
  // ---------------------------------------------
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
      )
  ].map(c => c.toJSON());

  await client.application.commands.set(commands);
  console.log("Slash commands registered.");
});

// ---------------------------------------------
// INTERACTION HANDLER
// ---------------------------------------------
client.on("interactionCreate", async (interaction) => {
  if (interaction.isChatInputCommand()) {
    const name = interaction.commandName;

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
  }

  // ---------------------------------------------
  // MODAL SUBMISSIONS
  // ---------------------------------------------
  if (interaction.isModalSubmit()) {
    // embed create modal
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

    // olgasm announce modal
    if (interaction.customId === "olgasm_announce_modal") {
      const description = interaction.fields.getTextInputValue("description");

      const embed = new EmbedBuilder()
        .setColor(BURGUNDY)
        .setTitle("📰 OLGASM 24' NEWS")
        .setDescription(description)
        .setFooter({ text: OLGA_FOOTER });

      const channel = await client.channels.fetch(ANNOUNCE_CHANNEL_ID);
      await channel.send({ embeds: [embed] });

      return interaction.reply({
        content: `Announcement sent to <#${ANNOUNCE_CHANNEL_ID}>`,
        ephemeral: true
      });
    }
  }
});

client.login(process.env.TOKEN);
