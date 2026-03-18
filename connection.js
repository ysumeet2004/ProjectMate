const mongoose = require('mongoose');
const logger = require('./utils/logger');

function connectionHandler() {
  const mongoURL = process.env.MONGO_URL || 'mongodb://localhost:27017/project_handler';
  
  mongoose.connect(mongoURL)
    .then(() => logger.info('[✅] Connected to MongoDB'))
    .catch(err => logger.error('[❌] MongoDB connection error: %o', err));
}

module.exports = connectionHandler;
