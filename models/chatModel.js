import mongoose from "mongoose";

// Define the chat schema
const chatSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User",  // Reference to the User model
    required: true 
  },
  messages: [
    {
      content: { 
        type: String, 
        required: true  // Ensure the message content is required
      },
      timestamp: { 
        type: Date, 
        default: Date.now  // Automatically set the timestamp when the message is added
      }
    }
  ]
});

// Create the Chat model from the schema
const Chat = mongoose.model("Chat", chatSchema);

export default Chat;
