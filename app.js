const express = require('express');
const cors = require('cors');



const app = express();
const PORT = 3000;

const productRoute = require('./routes/product_routes');

// Middleware to parse JSON data
app.use(express.json());
// Enable CORS for all origins
app.use(cors());
app.use(express.urlencoded({ extended: true }));
// app.use('/uploads', express.static('uploads'));
app.use("/", productRoute);

// 1. Connect to MongoDB (Replace with your Atlas URI if using Cloud)
// mongoose.connect('mongodb://localhost:27017/Ag_One')
//   .then(() => console.log('✅ Connected to MongoDB'))
//   .catch(err => console.error('❌ Connection error:', err));

// 2. Define a simple Route
app.get('/', (req, res) => {
  res.send('Server is running!');
});

// 3. Start the Server
app.listen(PORT, () => {
  console.log(`🚀 Server listening on http://localhost:${PORT}`);
});