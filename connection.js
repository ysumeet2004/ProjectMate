const mongoose = require('mongoose');

function connectionHandler() {
  const mongoURL = process.env.MONGO_URL || 'mongodb://localhost:27017/project_handler';
  
  mongoose.connect(mongoURL)
    .then(() => console.log(`[✅] Connected to MongoDB`))
    .catch(err => console.error(`[❌] MongoDB connection error:`, err));
}

module.exports = connectionHandler;
