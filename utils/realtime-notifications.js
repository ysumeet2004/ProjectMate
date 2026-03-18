/**
 * Real-Time Notifications Setup Guide
 * 
 * This file demonstrates how to implement real-time notifications using Socket.io
 * 
 * SETUP INSTRUCTIONS:
 * 
 * 1. Install Socket.io:
 *    npm install socket.io socket.io-client
 * 
 * 2. Add to package.json scripts:
 *    "devStart": "nodemon index.js"
 * 
 * 3. Update index.js:
 *    const http = require('http');
 *    const socketIO = require('socket.io');
 *    const app = express();
 *    const server = http.createServer(app);
 *    const io = socketIO(server, {
 *      cors: { origin: "*", methods: ["GET", "POST"] }
 *    });
 * 
 * 4. Replace: app.listen(PORT, ...) with:
 *    server.listen(PORT, '0.0.0.0', () => { ... })
 * 
 * 5. Add Socket.io event handlers (see below)
 */

// Example Socket.io Namespace for Projects
const setupProjectNotifications = (io) => {
  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Join user to a room based on their user ID
    socket.on('user-connected', (userId) => {
      socket.join(`user-${userId}`);
      console.log(`User ${userId} joined their notification room`);
    });

    // Listen for new project applications
    socket.on('application-submitted', (data) => {
      // Notify project creator
      io.to(`user-${data.projectCreatorId}`).emit('new-application', {
        projectId: data.projectId,
        applicantName: data.applicantName,
        applicantId: data.applicantId,
        timestamp: new Date(),
        message: `${data.applicantName} applied to your project`
      });
    });

    // Notify when applicant is approved
    socket.on('applicant-approved', (data) => {
      io.to(`user-${data.applicantId}`).emit('application-approved', {
        projectId: data.projectId,
        projectTitle: data.projectTitle,
        message: `You've been approved for "${data.projectTitle}"`
      });
    });

    // Notify when applicant is rejected
    socket.on('applicant-rejected', (data) => {
      io.to(`user-${data.applicantId}`).emit('application-rejected', {
        projectId: data.projectId,
        projectTitle: data.projectTitle,
        message: `Your application was not selected for "${data.projectTitle}"`
      });
    });

    // New message notification
    socket.on('message-sent', (data) => {
      io.to(`user-${data.recipientId}`).emit('new-message', {
        senderId: data.senderId,
        senderName: data.senderName,
        message: data.message.substring(0, 50) + '...',
        timestamp: new Date()
      });
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.id}`);
    });
  });
};

/**
 * CLIENT-SIDE SETUP
 * 
 * Add to views/partials/scripts.ejs:
 * 
 * <script src="https://cdn.socket.io/4.5.4/socket.io.min.js"></script>
 * <script>
 *   const socket = io();
 *   const userId = '<%= typeof user !== "undefined" && user ? user.id : null %>';
 *   
 *   if (userId) {
 *     socket.emit('user-connected', userId);
 *     
 *     // Listen for new applications
 *     socket.on('new-application', (data) => {
 *       showNotification('🔔 New Application', data.message);
 *       updateApplicationCount();
 *     });
 *     
 *     // Listen for approval notifications
 *     socket.on('application-approved', (data) => {
 *       showNotification('✅ Approved!', data.message);
 *     });
 *     
 *     // Listen for new messages
 *     socket.on('new-message', (data) => {
 *       showNotification('💬 New Message', `From ${data.senderName}`);
 *       updateMessageCount();
 *     });
 *   }
 * </script>
 */

module.exports = { setupProjectNotifications };
