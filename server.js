import express from "express";
import http from "http";
import { Server } from "socket.io";
import path from "path";
import session from "express-session";
import mongoose from "mongoose";
import multer from "multer"; // For handling file uploads
import User from "./models/userModel.js";
import Chat from "./models/chatModel.js";
import { predefinedSkills } from "./models/skillsData.js";

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

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/uploads/"); // Save uploaded files to the 'public/uploads' directory
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname); // Generate a unique filename
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true); // Accept only image files
  } else {
    cb(new Error("Only image files are allowed!"), false);
  }
};

const upload = multer({ storage, fileFilter });

app.set("view engine", "ejs");

// Serve static files from the 'public' directory
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

// Updated Signup Route to Handle Profile Picture Uploads
// After signup, redirect to skills page
app.post("/signup", upload.single("profilePicture"), async (req, res) => {
  const { username, email, password, qualification } = req.body;
  const profilePicture = req.file ? `/uploads/${req.file.filename}` : null;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.send("Email already in use!");
  }

  const newUser = new User({
    username,
    email,
    password,
    qualification,
    profilePicture,
  });

  await newUser.save();
  req.session.user = newUser; // Store user session
  res.redirect("/skills"); // Redirect to skills page
});

// Show skills entry page
app.get("/skills", (req, res) => {
  if (!req.session.user) {
    return res.redirect("/login");
  }
  res.render("skills");
});

// Save user skills and redirect to home
app.post("/save-skills", async (req, res) => {
  if (!req.session.user) {
    return res.redirect("/login");
  }

  const { skills, abilities, interests } = req.body;
  await User.findByIdAndUpdate(req.session.user._id, { skills, abilities, interests });

  res.redirect("/home"); // Redirect to home page
});

// After login, check if user has skills data
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });

  if (user && (await user.comparePassword(password))) {
    req.session.user = user;
    
    // If user has no skills, redirect to skills page
    if (!user.skills || !user.abilities || !user.interests) {
      return res.redirect("/skills");
    }

    res.redirect("/home");
  } else {
    res.send("Invalid credentials!");
  }
});

// Route to show the login page
app.get("/login", (req, res) => {
  res.render("login"); // This renders the login.ejs page
});

// Home Page Route
app.get("/home", (req, res) => {
  if (req.session.user) {
    res.render("home", { user: req.session.user }); // Render home.ejs with user data
  } else {
    res.redirect("/login"); // Redirect to login if no session
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
    let botReply =
      predefinedReplies[userMessage] || "I'm here to help! Ask me anything.";
    let roadmap = null;
    let matched = false;

    try {
      // Check if the user message matches skills
      const userSkills = userMessage
        .split(",")
        .map((skill) => skill.trim().toLowerCase());

      for (const skillSet in predefinedSkills) {
        const normalizedSkills = predefinedSkills[skillSet].skills.map(
          (skill) => skill.toLowerCase()
        );

        const match = userSkills.some((skill) =>
          normalizedSkills.includes(skill)
        );

        if (match) {
          matched = true;
          roadmap = {
            title: `Roadmap for ${skillSet}`,
            steps: predefinedSkills[skillSet].roadmap.map((step) => ({
              step,
              completed: false,
            })),
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

// Start the server
server.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
