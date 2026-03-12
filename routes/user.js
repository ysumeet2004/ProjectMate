const express = require('express');
const router = express.Router();
const verifyToken = require('../middlewares/auth'); // Your auth middleware
const {
    showProfile,
    logoutUser,
    renderLoginPage,
    handleUserLogin,
    renderSignupPage,
    handleUserSignup
} = require('../controllers/user');

// Route to show the user's profile page (Protected)
router.get('/profile', verifyToken, showProfile);

// Route to handle user logout (Protected)
router.get('/logout', verifyToken, logoutUser);

// --- UNCOMMENTED AND UPDATED ---

// GET route to show the login page
router.get('/login', renderLoginPage);

// POST route to handle login form submission
router.post('/login', handleUserLogin);

// GET route to show the signup page
router.get('/signup', renderSignupPage);

// POST route to handle signup form submission
router.post('/signup', handleUserSignup);

module.exports = router;
