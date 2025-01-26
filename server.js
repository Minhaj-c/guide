import express from "express";
import path from "path";
import session from "express-session";
import mongoose from "mongoose";
import User from "./models/userModel.js"; 
import Chat from './models/chatModel.js'; 

const app = express();
const port = 3000;


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

app.get("/", (req, res) => {
  res.render("index");
});

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

app.get("/login", (req, res) => {
  res.render("login");
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });

  if (user && (await user.comparePassword(password))) {
    req.session.user = user;
    res.redirect("/home");
  } else {
    res.send("Invalid credentials!");
  }
});

app.get("/dashboard", (req, res) => {
  if (req.session.user) {
    res.render("dashboard", { user: req.session.user });
  } else {
    res.redirect("/login");
  }
});

app.get("/edit-profile", (req, res) => {
  if (req.session.user) {
    res.render("edit-profile", { user: req.session.user });
  } else {
    res.redirect("/login");
  }
});

app.post("/edit-profile", async (req, res) => {
  const { username, email, qualification } = req.body;

  if (req.session.user) {
    try {
      const updatedUser = await User.findByIdAndUpdate(
        req.session.user._id,
        { username, email, qualification },
        { new: true }
      );

      req.session.user = updatedUser;

      res.redirect("/dashboard");
    } catch (err) {
      console.error(err);
      res.send("Error updating profile. Please try again.");
    }
  } else {
    res.redirect("/login");
  }
});

app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.redirect("/dashboard");
    }
    res.redirect("/login");
  });
});


app.get("/home", (req, res) => {
  if (req.session.user) {
    res.render("home", { user: req.session.user }); 
  } else {
    res.redirect("/login");
  }
});

app.get("/chat", async (req, res) => {
  if (req.session.user) {
    try {
      
      let chat = await Chat.findOne({ userId: req.session.user._id });

      if (!chat) {
        
        chat = new Chat({
          userId: req.session.user._id,
          messages: [], 
        });
        await chat.save();
      }

      
      const messages = chat.messages.map((msg) => `${req.session.user.username}: ${msg.content}`);
      res.render("chat", { user: req.session.user, messages });
    } catch (err) {
      console.error("Error loading chat messages:", err);
      res.render("chat", { user: req.session.user, messages: [] }); 
    }
  } else {
    res.redirect("/login");
  }
});


app.post("/chat", async (req, res) => {
  if (req.session.user) {
    const { message } = req.body;

    try {
      
      let chat = await Chat.findOne({ userId: req.session.user._id });

      if (!chat) {
        chat = new Chat({
          userId: req.session.user._id,
          messages: [],
        });
      }

      
      chat.messages.push({ content: message });
      await chat.save();

      
      res.redirect("/chat");
    } catch (err) {
      console.error("Error saving chat message:", err);
      res.send("Error processing your message. Please try again.");
    }
  } else {
    res.redirect("/login");
  }
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
