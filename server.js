import express from "express";
import http from "http"; // Required to create an HTTP server for Socket.IO
import { Server } from "socket.io"; // Import Socket.IO
import path from "path";
import session from "express-session";
import mongoose from "mongoose";
import User from "./models/userModel.js";
import Chat from "./models/chatModel.js";
import { predefinedSkills } from "./models/skillsData.js"; // Import predefined skills and roadmaps

const app = express();
const port = 3000;

// Create an HTTP server to work with Socket.IO
const server = http.createServer(app);
const io = new Server(server);

// MongoDB connection setup
mongoose
  .connect("mongodb://localhost:27017/career-recommender")
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((error) => {
    console.error("Error connecting to MongoDB:", error);
  });

app.set("view engine", "ejs");

app.use(express.static(path.join(path.resolve(), "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(
  session({
    secret: "your-secret-key",
    resave: false,
    saveUninitialized: true,
  })
);

// Routes for Signup, Login, Home, and Dashboard
app.get("/", (req, res) => res.render("index"));

app.post("/signup", async (req, res) => {
  const { username, email, password, qualification } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.send("Email already in use!");
  }

  const newUser = new User({ username, email, password, qualification });
  await newUser.save();

  res.redirect("/login");
});

app.get("/login", (req, res) => res.render("login"));

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });

  if (user && (await user.comparePassword(password))) {
    req.session.user = user;
    res.redirect("/home"); // Redirect to home page after login
  } else {
    res.send("Invalid credentials!");
  }
});

// Home Page Route
app.get("/home", (req, res) => {
  if (req.session.user) {
    res.render("home", { user: req.session.user });
  } else {
    res.redirect("/login");
  }
});

// Chat Route to handle the user's chat history and messages
app.get("/chat", async (req, res) => {
  if (req.session.user) {
    try {
      let chat = await Chat.findOne({ userId: req.session.user._id });

      if (!chat) {
        chat = new Chat({
          userId: req.session.user._id,
          username: req.session.user.username,
          messages: [],
        });
        await chat.save();
      }

      res.render("chat", {
        user: req.session.user,
        messages: chat.messages,
      });
    } catch (err) {
      console.error("Error loading chat messages:", err);
      res.render("chat", { user: req.session.user, messages: [] });
    }
  } else {
    res.redirect("/login");
  }
});

// Handle chat messages and skills matching
// Handle chat messages and skills matching
app.post("/chat", async (req, res) => {
  if (req.session.user) {
    const { message } = req.body;

    // Predefined replies for basic greetings
    const predefinedReplies = {
      hi: "Hello! How can I assist you today?",
      hello: "Hi there! How can I help?",
      hey: "Hey! What can I do for you?",
      howdy: "Howdy! Need any assistance?",
    };

    const userMessage = message.trim().toLowerCase();
    let botReply = predefinedReplies[userMessage] || "I'm here to help! Ask me anything.";
    let roadmap = null;
    let matched = false;

    try {
      // Check if the user message matches skills
      const userSkills = userMessage.split(",").map((skill) => skill.trim().toLowerCase());

      for (const skillSet in predefinedSkills) {
        const normalizedSkills = predefinedSkills[skillSet].skills.map((skill) => skill.toLowerCase());

        const match = userSkills.some((skill) => normalizedSkills.includes(skill));

        if (match) {
          matched = true;
          roadmap = {
            title: `Roadmap for ${skillSet}`,
            steps: predefinedSkills[skillSet].roadmap.map((step) => ({ step, completed: false })),
          };
          botReply = `Great! Here's a roadmap for ${skillSet}.`;
          break;
        }
      }

      // Find or create chat history
      let chat = await Chat.findOne({ userId: req.session.user._id });

      if (!chat) {
        chat = new Chat({
          userId: req.session.user._id,
          username: req.session.user.username,
          messages: [],
        });
        await chat.save();
      }

      // Save messages
      chat.messages.push({ content: message, sender: "user" });
      chat.messages.push({ content: botReply, sender: "bot" });
      await chat.save();

      io.emit("chat message", { username: req.session.user.username, message });
      io.emit("chat message", { username: "Bot", message: botReply });

      // Redirect based on match
      if (matched) {
        res.render("roadmap", { roadmap }); // Pass roadmap to the template
      } else {
        res.render("chat", {
          user: req.session.user,
          messages: chat.messages,
        });
      }
    } catch (err) {
      console.error("Error saving chat message:", err);
      res.send("Error processing your message. Please try again.");
    }
  } else {
    res.redirect("/login");
  }
});



app.post("/update-roadmap", (req, res) => {
  if (req.session.user) {
    const { index, completed } = req.body;

    // Logic to update the roadmap in the database
    // Example:
    // Assuming req.session.user.roadmap.steps exists and contains steps for this user
    if (req.session.user.roadmap && req.session.user.roadmap.steps) {
      req.session.user.roadmap.steps[index].completed = completed;

      // Save the updated user data to the database (if applicable)
      User.findByIdAndUpdate(req.session.user._id, {
        roadmap: req.session.user.roadmap,
      })
        .then(() => res.status(200).send("Step updated successfully."))
        .catch((err) => {
          console.error("Error updating roadmap:", err);
          res.status(500).send("Failed to update roadmap.");
        });
    } else {
      res.status(400).send("Roadmap not found.");
    }
  } else {
    res.status(403).send("Unauthorized.");
  }
});

// Start the server


// Start the server
server.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
