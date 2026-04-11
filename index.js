const express = require("express");
const path = require("path");

const app = express();
const port = 3000;

// Serve static files
app.use(express.static(path.join(__dirname, "modules", "frontend")));
app.use("/modules/frontend", express.static(path.join(__dirname, "modules", "frontend")));
app.use("/modules/backend", express.static(path.join(__dirname, "modules", "backend")));
app.use("/assets", express.static(path.join(__dirname, "assets")));
// Serve the home page from the home-page folder
app.get("/homepage", (req, res) => {
  res.sendFile(
    path.join(__dirname, "modules", "frontend", "page.html"),
    (err) => {
      if (err) {
        console.error("Failed to send home-page.html:", err);
        res.status(err.status || 500).send("Internal Server Error");
      }
    },
  );
});

// Redirect old dashboard route to homepage
app.get("/dashboard", (req, res) => {
  res.redirect("/homepage");
});

// Fallback route to homepage
app.get("/", (req, res) => {
  res.redirect("/homepage");
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log(`Open http://localhost:${port}/homepage`);
});
