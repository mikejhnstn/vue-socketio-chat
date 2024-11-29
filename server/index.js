const app = require("express")();
const http = require("http").Server(app);
const io = require("socket.io")(http);
const mongoose = require("mongoose");
const port = 1337;

let users = [];
let messages = [];

// Connect to MongoDB
mongoose.connect("mongodb://localhost:27017/chatdb", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Define Schema and Model
const ChatSchema = mongoose.Schema({
  username: String,
  msg: String,
});

const ChatModel = mongoose.model("chat", ChatSchema);

// Use Promises to fetch messages
ChatModel.find()
  .then((result) => {
    messages = result;
  })
  .catch((err) => {
    console.error("Error fetching messages:", err);
  });

// Socket.io Events
io.on("connection", (socket) => {
  // Send initial data to the connected client
  socket.emit("loggedIn", {
    users: users.map((s) => s.username),
    messages: messages,
  });

  // Handle new user joining
  socket.on("newUser", (username) => {
    socket.username = username;
    users.push(socket);

    io.emit("userOnline", socket.username);
  });

  // Handle new message
  socket.on("msg", async (msg) => {
    try {
      const message = new ChatModel({
        username: socket.username,
        msg: msg,
      });

      const result = await message.save(); // Save message using async/await
      messages.push(result);

      io.emit("msg", result);
    } catch (err) {
      console.error("Error saving message:", err);
    }
  });

  // Handle user disconnect
  socket.on("disconnect", () => {
    io.emit("userLeft", socket.username);
    users.splice(users.indexOf(socket), 1);
  });
});

// Start the server
http.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
