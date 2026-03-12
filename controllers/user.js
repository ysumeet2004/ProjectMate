const User = require('../models/user');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// --- NEW FUNCTION: Render Login Page ---
function renderLoginPage(req, res) {
    // Pass an empty error object initially
    res.render('login', { error: null });
}

// --- NEW FUNCTION: Render Signup Page ---
function renderSignupPage(req, res) {
    // Pass an empty error object initially
    res.render('signup', { error: null });
}

// --- NEW FUNCTION: Handle User Signup ---
async function handleUserSignup(req, res) {
    console.log("h1");
    const { name, email, password } = req.body;
    try {
        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.render('signup', { error: "Email already in use" });
        }

        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create new user
        const newUser = new User({
            name,
            email,
            password: hashedPassword,
        });
        await newUser.save();

        // Redirect to login page after successful signup
        res.redirect('/user/login');
    } catch (err) {
        console.error("Signup Error:", err);
        res.render('signup', { error: "Something went wrong. Please try again." });
    }
}

// --- NEW FUNCTION: Handle User Login ---
async function handleUserLogin(req, res) {
    const { email, password } = req.body;
    try {
        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.render('login', { error: "Invalid email or password" });
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.render('login', { error: "Invalid email or password" });
        }

        // Create JWT payload
        const payload = {
            id: user._id,
            name: user.name,
            email: user.email
        };
        console.log("check-one");

        // Sign the token
        const token = jwt.sign(
            payload,
            process.env.JWT_SECRET, // Make sure JWT_SECRET is in your .env file
            { expiresIn: '1d' } // Token expires in 1 day
        );
        console.log("check-two");
        // Set cookie
        res.cookie('token', token, {
            httpOnly: true,
            // Use secure cookies in production
            maxAge: 24 * 60 * 60 * 1000 // 1 day
        });

        // Redirect to home page
        res.redirect('/');

    } catch (err) {
        console.error("Login Error:", err);
        res.render('login', { error: "Something went wrong. Please try again." });
    }
}

// --- EXISTING FUNCTION: Show Profile ---
async function showProfile(req, res) {
    try {
        // req.user is added by your verifyToken middleware
        // We find the user again just to be 100% sure we have the latest data
        const user = await User.findById(req.user.id).select('-password'); // Don't send password
        if (!user) {
            return res.status(404).send('User not found');
        }
        res.render('profile', { user });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
}

// --- EXISTING FUNCTION: Logout ---
function logoutUser(req, res) {
    // Clear the token cookie
    res.cookie('token', '', {
        httpOnly: true,
        expires: new Date(0) // Set expiry date to the past
    });
    res.redirect('/user/login');
}


module.exports = {
    showProfile,
    logoutUser,
    renderLoginPage,
    handleUserLogin,
    renderSignupPage,
    handleUserSignup
};

