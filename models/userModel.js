import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// Define the User schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  qualification: { type: String, required: true },
  profilePicture: { type: String }, // Add profile picture field
});

// Hash the password before saving the user
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  // Hash the password with bcrypt
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Compare entered password with the hashed password in the database
userSchema.methods.comparePassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

// Create the User model
const User = mongoose.model('User', userSchema);

// Export the User model
export default User;