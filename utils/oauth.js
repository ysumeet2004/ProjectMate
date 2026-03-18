/**
 * OAuth Configuration & Helpers
 * 
 * This file provides OAuth scaffolding for GitHub and Google authentication.
 * To implement full OAuth, install:
 *   npm install passport passport-github passport-google-oauth20
 * 
 * Then configure with your OAuth credentials from:
 * - GitHub: https://github.com/settings/developers
 * - Google: https://console.developers.google.com
 */

const logger = require('./logger');

/**
 * GitHub OAuth Configuration
 * Set these environment variables:
 *   GITHUB_CLIENT_ID
 *   GITHUB_CLIENT_SECRET
 *   GITHUB_CALLBACK_URL (default: http://localhost:8000/auth/github/callback)
 */
const githubConfig = {
  clientID: process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
  callbackURL: process.env.GITHUB_CALLBACK_URL || 'http://localhost:8000/auth/github/callback'
};

/**
 * Google OAuth Configuration
 * Set these environment variables:
 *   GOOGLE_CLIENT_ID
 *   GOOGLE_CLIENT_SECRET
 *   GOOGLE_CALLBACK_URL (default: http://localhost:8000/auth/google/callback)
 */
const googleConfig = {
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:8000/auth/google/callback'
};

/**
 * Verify OAuth is properly configured
 */
function verifyOAuthSetup() {
  if (process.env.NODE_ENV === 'production') {
    if (!githubConfig.clientID) {
      logger.warn('GITHUB_CLIENT_ID not configured for OAuth');
    }
    if (!googleConfig.clientID) {
      logger.warn('GOOGLE_CLIENT_ID not configured for OAuth');
    }
  }
}

/**
 * TODO: Create or update user from OAuth profile
 * This function should be called after OAuth authentication succeeds
 * 
 * @param {string} provider - 'github' or 'google'
 * @param {object} profile - OAuth profile data
 * @returns {Promise<User>} - Created or updated user document
 */
async function createOrUpdateOAuthUser(provider, profile) {
  const User = require('../models/user');
  
  try {
    // Look for existing user
    let user = await User.findOne({
      [`${provider}Id`]: profile.id
    });

    if (!user) {
      // Create new user
      user = new User({
        name: profile.displayName || profile.emails?.[0]?.value?.split('@')[0],
        email: profile.emails?.[0]?.value || `${provider}-${profile.id}@projectmate.local`,
        [`${provider}Id`]: profile.id,
        [`${provider}Profile`]: profile,
        // User should set password later or use OAuth-only login
      });
      await user.save();
      logger.info(`Created new user from ${provider} OAuth: ${user.email}`);
    } else {
      // Update existing user
      user[`${provider}Profile`] = profile;
      await user.save();
      logger.info(`Updated user from ${provider} OAuth: ${user.email}`);
    }

    return user;
  } catch (err) {
    logger.error(`Error in OAuth user creation (${provider}): %o`, err);
    throw err;
  }
}

module.exports = {
  githubConfig,
  googleConfig,
  verifyOAuthSetup,
  createOrUpdateOAuthUser
};
