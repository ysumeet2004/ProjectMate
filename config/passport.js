const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/user');
const logger = require('../utils/logger');

// Serialize user for sessions
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from sessions
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    logger.error('Deserialize error: %o', err);
    done(err);
  }
});

// GitHub Strategy
passport.use(new GitHubStrategy(
  {
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: process.env.GITHUB_CALLBACK_URL || 'http://localhost:8000/auth/github/callback'
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Check if user already exists with this GitHub ID
      let user = await User.findOne({ githubId: profile.id });

      if (!user) {
        // Check if email exists (user signed up with email first)
        const emailUser = await User.findOne({ email: profile.emails?.[0]?.value });
        
        if (emailUser) {
          // Link GitHub to existing account
          emailUser.githubId = profile.id;
          emailUser.githubProfile = profile;
          await emailUser.save();
          logger.info(`Linked GitHub profile to existing user: ${emailUser.email}`);
          return done(null, emailUser);
        }

        // Create new user
        user = new User({
          name: profile.displayName || profile.username,
          email: profile.emails?.[0]?.value || `${profile.username}@github-${profile.id}.local`,
          githubId: profile.id,
          githubProfile: profile,
          password: 'oauth-github', // Placeholder for OAuth users
          avatar: profile.photos?.[0]?.value || ''
        });
        await user.save();
        logger.info(`Created new user from GitHub: ${user.email}`);
      } else {
        // Update profile info
        user.githubProfile = profile;
        user.avatar = profile.photos?.[0]?.value || user.avatar;
        await user.save();
        logger.info(`Updated GitHub profile for user: ${user.email}`);
      }

      return done(null, user);
    } catch (err) {
      logger.error('GitHub auth strategy error: %o', err);
      return done(err);
    }
  }
));

// Google Strategy
passport.use(new GoogleStrategy(
  {
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:8000/auth/google/callback'
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Check if user already exists with this Google ID
      let user = await User.findOne({ googleId: profile.id });

      if (!user) {
        // Check if email exists (user signed up with email first)
        const emailUser = await User.findOne({ email: profile.emails?.[0]?.value });
        
        if (emailUser) {
          // Link Google to existing account
          emailUser.googleId = profile.id;
          emailUser.googleProfile = profile;
          await emailUser.save();
          logger.info(`Linked Google profile to existing user: ${emailUser.email}`);
          return done(null, emailUser);
        }

        // Create new user
        user = new User({
          name: profile.displayName,
          email: profile.emails?.[0]?.value,
          googleId: profile.id,
          googleProfile: profile,
          password: 'oauth-google', // Placeholder for OAuth users
          avatar: profile.photos?.[0]?.value || ''
        });
        await user.save();
        logger.info(`Created new user from Google: ${user.email}`);
      } else {
        // Update profile info
        user.googleProfile = profile;
        user.avatar = profile.photos?.[0]?.value || user.avatar;
        await user.save();
        logger.info(`Updated Google profile for user: ${user.email}`);
      }

      return done(null, user);
    } catch (err) {
      logger.error('Google auth strategy error: %o', err);
      return done(err);
    }
  }
));

module.exports = passport;
