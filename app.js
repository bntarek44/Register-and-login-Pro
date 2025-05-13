require("dotenv").config(); // حمّل .env في الأول
const express = require('express');
const app = express();
const mongoose = require('mongoose');
const cors = require("cors");
const bodyParser = require("body-parser");
const UserRouter = require("./routes");

// ✅ ترتيب الميدلوير مهم
app.use(cors());
app.use(bodyParser.json());
app.use(express.json());



// ✅ use routes
app.use('/api/users', UserRouter);  // هنغير في routes كمان تبع ده

// ✅ fallback 404
app.use((req, res) => {
    res.status(404).send({ url: req.originalUrl + ' not found' });
});


// ✅ MongoDB connection
mongoose.connect(process.env.DB_URI)
    .then(() => console.log("✅ MongoDB Connected"))
    .catch(err => console.error('❌ MongoDB connection failed:', err));

// ✅ start server
const server = app.listen(process.env.PORT, () => {
  console.log(`🚀 Server running on port ${process.env.PORT}`);
}).on('error', (err) => {
  console.error("❌ Server failed to start:", err.message);
});

