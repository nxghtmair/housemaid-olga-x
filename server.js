const express = require("express");
const fetch = require("node-fetch");

const app = express();
const PORT = process.env.PORT || 3000;

// Web server so Render thinks your bot is a web service
app.get("/", (req, res) => {
  res.send("Bot is alive!");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Keep-alive ping every 5 minutes
setInterval(() => {
  fetch("https://housemaid-olga-x.onrender.com/")
    .then(() => console.log("Keep-alive ping sent"))
    .catch(err => console.error("Ping failed:", err));
}, 5 * 60 * 1000);
