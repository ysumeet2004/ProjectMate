const express = require('express');
const router = express.Router();
const verifyToken = require('../middlewares/auth'); // Your auth middleware
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');

// Basic rate limiters for auth endpoints
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false });
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 6, message: 'Too many login attempts, please try again later.', standardHeaders: true, legacyHeaders: false });
const {
    showProfile,
    updateProfile,
    showSettings,
    updateSettings,
    logoutUser,
    renderLoginPage,
    handleUserLogin,
    renderSignupPage,
    handleUserSignup
} = require('../controllers/user');

// Route to show the user's profile page (Protected)
router.get('/profile', verifyToken, showProfile);

// Route to update profile settings (phone / links etc.)
router.post('/profile', verifyToken,
    body('bio').optional().isLength({ max: 500 }).withMessage('Bio must be 500 characters or less'),
    body('phone').optional().isString().trim().isLength({ max: 30 }).withMessage('Phone invalid'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).render('profile', { error: errors.array()[0].msg, currentPath: req.path });
        }
        next();
    },
    updateProfile);

// Route to handle user logout (Protected)
router.get('/logout', verifyToken, logoutUser);

// Route to show the user's settings page (Protected)
router.get('/settings', verifyToken, showSettings);

// Route to update account settings (Protected)
router.post('/settings', verifyToken, updateSettings);

// --- UNCOMMENTED AND UPDATED ---

// GET route to show the login page
router.get('/login', renderLoginPage);

// POST route to handle login form submission (rate limited)
router.post('/login', loginLimiter,
    body('email').trim().isEmail().withMessage('Please enter a valid email'),
    body('password').exists().withMessage('Password is required'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.render('login', { error: errors.array()[0].msg, currentPath: req.path });
        }
        next();
    },
    handleUserLogin);

// GET route to show the signup page
router.get('/signup', renderSignupPage);

// POST route to handle signup form submission (rate limited)
router.post('/signup', authLimiter,
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').trim().isEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.render('signup', { error: errors.array()[0].msg, currentPath: req.path });
        }
        next();
    },
    handleUserSignup);

module.exports = router;
