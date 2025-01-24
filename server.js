import express from 'express';
import path from 'path';
import session from 'express-session';
import mongoose from 'mongoose';
import User from './models/userModel.js';  // Import the User model

const app = express();
const port = 3000;

// MongoDB connection setup
mongoose.connect('mongodb://localhost:27017/career-recommender')
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((error) => {
    console.error('Error connecting to MongoDB:', error);
  });


// Set the view engine to EJS
app.set('view engine', 'ejs');

// Serve static files from the 'public' folder
app.use(express.static(path.join(path.resolve(), 'public')));

// Middleware for parsing form data
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session management middleware
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true,
}));

// Route to render the signup page
app.get('/', (req, res) => {
  res.render('index');
});

// Route to handle user signup
app.post('/signup', async (req, res) => {
  const { username, email, password, qualification } = req.body;

  // Check if email already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.send('Email already in use!');
  }

  // Create a new user and save it to MongoDB
  const newUser = new User({ username, email, password, qualification });
  await newUser.save();

  // Redirect to login page after successful signup
  res.redirect('/login');
});

// Route to render the login page
app.get('/login', (req, res) => {
  res.render('login');
});

// Route to handle user login
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }); // Find user by email

  if (user && await user.comparePassword(password)) {
    // Store user info in session
    req.session.user = user;
    res.redirect('/dashboard'); // Redirect to dashboard after successful login
  } else {
    res.send('Invalid credentials!');
  }
});

// Route to render user dashboard (only accessible when logged in)
app.get('/dashboard', (req, res) => {
  if (req.session.user) {
    res.render('dashboard', { user: req.session.user });
  } else {
    res.redirect('/login'); // Redirect to login page if not authenticated
  }
});

// Route to handle user logout
app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.redirect('/dashboard');
    }
    res.redirect('/login');
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
