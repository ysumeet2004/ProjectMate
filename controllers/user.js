const User = require('../models/user');
const project = require('../models/project'); // Add this import
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

// --- NEW FUNCTION: Get Profile Statistics ---
async function getProfileStats(userId) {
    try {
        const [projectsCreated, projectsJoined, totalProjects] = await Promise.all([
            project.countDocuments({ createdBy: userId }),
            project.countDocuments({ approved_users: userId }),
            project.countDocuments({
                $or: [
                    { createdBy: userId },
                    { approved_users: userId }
                ]
            })
        ]);

        const completedProjects = await project.countDocuments({
            $or: [
                { createdBy: userId, status: 'FINISHED' },
                { approved_users: userId, status: 'FINISHED' }
            ]
        });

        const successRate = totalProjects > 0 ? Math.round((completedProjects / totalProjects) * 100) : 0;

        return {
            projectsCreated,
            projectsJoined,
            totalProjects,
            completedProjects,
            successRate
        };
    } catch (err) {
        logger.error('Error getting profile stats: %o', err);
        return {
            projectsCreated: 0,
            projectsJoined: 0,
            totalProjects: 0,
            completedProjects: 0,
            successRate: 0
        };
    }
}

// --- NEW FUNCTION: Get User Activities for Calendar ---
async function getUserActivities(userId) {
    try {
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

        // Get all projects created by user in the last year
        const createdProjects = await project.find({
            createdBy: userId,
            createdOn: { $gte: oneMonthAgo }
        }).select('createdOn title');

        // Get all applications by user in the last year
        const userApplications = await project.find({
            'applicants.user': userId,
            'applicants.appliedAt': { $gte: oneMonthAgo }
        }).select('applicants.$ title');

        // Get all approved projects for user in the last year
        const approvedProjects = await project.find({
            approved_users: userId,
            createdOn: { $gte: oneMonthAgo }
        }).select('createdOn title');

        // Combine all activities
        const activities = [];

        // Add project creations
        createdProjects.forEach(project => {
            activities.push({
                date: project.createdOn,
                type: 'created',
                title: project.title,
                description: 'Created project'
            });
        });

        // Add applications
        userApplications.forEach(project => {
            const application = project.applicants.find(app => app.user.toString() === userId.toString());
            if (application) {
                activities.push({
                    date: application.appliedAt,
                    type: 'applied',
                    title: project.title,
                    description: 'Applied to project'
                });
            }
        });

        // Add approvals (when user was approved for projects)
        approvedProjects.forEach(project => {
            activities.push({
                date: project.createdOn, // Using project creation date as approximation
                type: 'approved',
                title: project.title,
                description: 'Joined project'
            });
        });

        // Sort by date (most recent first)
        activities.sort((a, b) => new Date(b.date) - new Date(a.date));

        return activities.slice(0, 50); // Limit to 50 most recent activities
    } catch (err) {
        logger.error('Error getting user activities: %o', err);
        return [];
    }
}

// --- NEW FUNCTION: Render Login Page ---
function renderLoginPage(req, res) {
    // Pass an empty error object initially
    res.render('login', { error: null, currentPath: req.path });
}

// --- NEW FUNCTION: Render Signup Page ---
function renderSignupPage(req, res) {
    // Pass an empty error object initially
    res.render('signup', { error: null, currentPath: req.path });
}

// --- NEW FUNCTION: Handle User Signup ---
async function handleUserSignup(req, res) {
    logger.debug('Signup attempt');
    const { name, email, password } = req.body;
    try {
        // Basic input validation
        if (!name || !email || !password) {
            return res.render('signup', { error: 'Name, email and password are required', currentPath: req.path });
        }
        const normalizedEmail = String(email).trim().toLowerCase();
        const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
        if (!emailRegex.test(normalizedEmail)) {
            return res.render('signup', { error: 'Please provide a valid email address', currentPath: req.path });
        }
        if (String(password).length < 8) {
            return res.render('signup', { error: 'Password must be at least 8 characters', currentPath: req.path });
        }
        // Check if user already exists
        const existingUser = await User.findOne({ email: normalizedEmail });
        if (existingUser) {
            return res.render('signup', { error: "Email already in use", currentPath: req.path });
        }

        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create new user
        const newUser = new User({
            name: String(name).trim(),
            email: normalizedEmail,
            password: hashedPassword,
        });
        await newUser.save();

        // Redirect to login page after successful signup
        res.redirect('/user/login');
    } catch (err) {
        logger.error('Signup Error: %o', err);
        res.render('signup', { error: "Something went wrong. Please try again.", currentPath: req.path });
    }
}

// --- NEW FUNCTION: Handle User Login ---
async function handleUserLogin(req, res) {
    const { email, password } = req.body;
    try {
        // Find user by email
        const normalizedEmail = String(email || '').trim().toLowerCase();
        if (!normalizedEmail || !password) return res.render('login', { error: 'Email and password required', currentPath: req.path });

        const user = await User.findOne({ email: normalizedEmail });
        if (!user) {
            return res.render('login', { error: "Invalid email or password", currentPath: req.path });
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.render('login', { error: "Invalid email or password", currentPath: req.path });
        }

        // Create JWT payload
        const payload = {
            id: user._id,
            name: user.name,
            email: user.email
        };
        logger.silly('Signing token');

        // Sign the token
        const token = jwt.sign(
            payload,
            process.env.JWT_SECRET, // Make sure JWT_SECRET is in your .env file
            { expiresIn: '1d' } // Token expires in 1 day
        );
        logger.silly('Token signed');
        // Set cookie with secure flags
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 24 * 60 * 60 * 1000 // 1 day
        });

        // Redirect to home page
        res.redirect('/');

    } catch (err) {
        logger.error('Login Error: %o', err);
        res.render('login', { error: "Something went wrong. Please try again.", currentPath: req.path });
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

        // Get profile statistics
        const stats = await getProfileStats(user._id);

        // Get user activities for calendar
        const activities = await getUserActivities(user._id);

        res.render('profile', {
            user,
            isOwnProfile: true,
            canViewPhone: true,
            stats,
            activities,
            currentPath: req.path
        });
    } catch (err) {
        logger.error('%o', err);
        res.status(500).send('Server Error');
    }
}
// --- NEW FUNCTION: Update Profile ---
async function updateProfile(req, res) {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).send('User not found');
        }

        const { phone, showPhone, bio, skills, location, timezone } = req.body;

        // Build links array (support up to 3 links)
        const links = [];
        for (let i = 1; i <= 3; i++) {
            const name = (req.body[`linkName${i}`] || '').trim();
            const url = (req.body[`linkUrl${i}`] || '').trim();
            if (name || url) {
                links.push({ name, url });
            }
        }

        // Handle skills as array
        let skillsArray = [];
        if (typeof skills === 'string') {
            skillsArray = skills.split(',').map(s => s.trim()).filter(s => s);
        } else if (Array.isArray(skills)) {
            skillsArray = skills.filter(s => s && s.trim());
        }

        user.phone = phone || '';
        user.showPhone = showPhone === 'on';
        user.bio = bio || '';
        user.skills = skillsArray;
        user.location = location || '';
        user.timezone = timezone || '';
        user.links = links;

        await user.save();

        res.redirect('/user/profile');
    } catch (err) {
        logger.error('Profile update error: %o', err);
        res.status(500).send('Server Error');
    }
}
// --- NEW FUNCTION: Show Settings Page ---
async function showSettings(req, res) {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(404).send('User not found');
        }

        res.render('settings', {
            user,
            currentPath: req.path
        });
    } catch (err) {
        logger.error('Settings page error: %o', err);
        res.status(500).send('Server Error');
    }
}

// --- NEW FUNCTION: Update Settings ---
async function updateSettings(req, res) {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).send('User not found');
        }

        const { action } = req.body;

        // Change Password
        if (action === 'changePassword') {
            const { currentPassword, newPassword, confirmPassword } = req.body;

            if (!currentPassword || !newPassword || !confirmPassword) {
                return res.redirect('/user/settings?error=true&message=All+fields+are+required');
            }

            if (newPassword !== confirmPassword) {
                return res.redirect('/user/settings?error=true&message=New+passwords+do+not+match');
            }

            if (newPassword.length < 8) {
                return res.redirect('/user/settings?error=true&message=Password+must+be+at+least+8+characters');
            }

            const isMatch = await bcrypt.compare(currentPassword, user.password);
            if (!isMatch) {
                return res.redirect('/user/settings?error=true&message=Current+password+is+incorrect');
            }

            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(newPassword, salt);
            await user.save();
            logger.info('User %s changed password', user._id);
            return res.redirect('/user/settings?success=true&section=password');
        }

        // Update Privacy Settings
        if (action === 'updatePrivacy') {
            user.profileVisibility = req.body.profileVisibility || 'public';
            user.showEmail = req.body.showEmail === 'on' || req.body.showEmail === true;
            user.showPhone = req.body.showPhone === 'on' || req.body.showPhone === true;
            user.showProjectHistory = req.body.showProjectHistory !== 'off' && req.body.showProjectHistory !== false;
            await user.save();
            logger.info('User %s updated privacy settings', user._id);
            return res.redirect('/user/settings?success=true&section=privacy');
        }

        // Update Notification Preferences
        if (action === 'updateNotifications') {
            user.notifyApplications = req.body.notifyApplications === 'on' || req.body.notifyApplications === true;
            user.notifyApplicationStatus = req.body.notifyApplicationStatus === 'on' || req.body.notifyApplicationStatus === true;
            user.notifyMessages = req.body.notifyMessages === 'on' || req.body.notifyMessages === true;
            user.notifyProjectUpdates = req.body.notifyProjectUpdates === 'on' || req.body.notifyProjectUpdates === true;
            user.notificationFrequency = req.body.notificationFrequency || 'daily';
            await user.save();
            logger.info('User %s updated notification settings', user._id);
            return res.redirect('/user/settings?success=true&section=notifications');
        }

        // Update Collaboration Preferences
        if (action === 'updateCollaboration') {
            user.defaultCommitment = req.body.defaultCommitment || 'flexible';
            user.experienceLevel = req.body.experienceLevel || 'intermediate';
            user.collabAsync = req.body.collabAsync === 'on' || req.body.collabAsync === true;
            user.collabMeetings = req.body.collabMeetings === 'on' || req.body.collabMeetings === true;
            user.collabOpenFeedback = req.body.collabOpenFeedback === 'on' || req.body.collabOpenFeedback === true;
            await user.save();
            logger.info('User %s updated collaboration preferences', user._id);
            return res.redirect('/user/settings?success=true&section=collaboration');
        }

        // Disconnect OAuth - GitHub
        if (action === 'disconnectGithub') {
            user.githubId = undefined;
            user.githubProfile = null;
            await user.save();
            logger.info('User %s disconnected GitHub', user._id);
            return res.redirect('/user/settings?success=true&section=accounts');
        }

        // Disconnect OAuth - Google
        if (action === 'disconnectGoogle') {
            user.googleId = undefined;
            user.googleProfile = null;
            await user.save();
            logger.info('User %s disconnected Google', user._id);
            return res.redirect('/user/settings?success=true&section=accounts');
        }

        // Deactivate Account
        if (action === 'deactivateAccount') {
            user.isActive = false;
            user.deactivatedAt = new Date();
            await user.save();
            logger.info('User %s deactivated account', user._id);
            res.clearCookie('token', { path: '/' });
            return res.redirect('/user/login?deactivated=true');
        }

        // Download Data
        if (action === 'downloadData') {
            const userData = {
                profile: {
                    name: user.name,
                    email: user.email,
                    bio: user.bio,
                    skills: user.skills,
                    location: user.location,
                    timezone: user.timezone,
                    phone: user.showPhone ? user.phone : '[hidden]',
                    avatar: user.avatar,
                    links: user.links
                },
                settings: {
                    profileVisibility: user.profileVisibility,
                    notificationPreferences: {
                        applications: user.notifyApplications,
                        applicationStatus: user.notifyApplicationStatus,
                        messages: user.notifyMessages,
                        projectUpdates: user.notifyProjectUpdates,
                        frequency: user.notificationFrequency
                    },
                    collaborationPreferences: {
                        defaultCommitment: user.defaultCommitment,
                        experienceLevel: user.experienceLevel,
                        preferredStyles: {
                            async: user.collabAsync,
                            meetings: user.collabMeetings,
                            openFeedback: user.collabOpenFeedback
                        }
                    }
                },
                account: {
                    createdAt: user.createdAt,
                    lastUpdated: user.updatedAt,
                    isActive: user.isActive
                }
            };

            const filename = `projectmate-data-${user._id}-${new Date().toISOString().split('T')[0]}.json`;
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.setHeader('Content-Type', 'application/json');
            logger.info('User %s downloaded personal data', user._id);
            return res.json(userData);
        }

        // Delete Account
        if (action === 'deleteAccount') {
            const userId = user._id;
            
            // Delete all projects created by this user
            await require('../models/project').deleteMany({ createdBy: userId });
            
            // Remove user from approved_users in all projects
            await require('../models/project').updateMany(
                { approved_users: userId },
                { $pull: { approved_users: userId } }
            );
            
            // Delete user
            await User.findByIdAndDelete(userId);
            logger.warn('User %s deleted their account', userId);
            
            res.clearCookie('token', { path: '/' });
            return res.redirect('/user/login?deleted=true');
        }

        res.redirect('/user/settings?error=true&message=Invalid+action');
    } catch (err) {
        logger.error('Settings update error: %o', err);
        res.redirect('/user/settings?error=true&message=' + encodeURIComponent(err.message));
    }
}

// --- EXISTING FUNCTION: Logout ---
function logoutUser(req, res) {
    // Clear the token cookie
    res.clearCookie('token', { path: '/' });
    res.redirect('/user/login');
}


module.exports = {
    showProfile,
    updateProfile,
    showSettings,
    updateSettings,
    logoutUser,
    renderLoginPage,
    handleUserLogin,
    renderSignupPage,
    handleUserSignup
};

