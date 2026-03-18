const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const authRouter = express.Router();

// GitHub OAuth Routes
authRouter.get('/github', passport.authenticate('github', { scope: ['user:email'] }));

authRouter.get('/github/callback',
  passport.authenticate('github', { failureRedirect: '/login' }),
  (req, res) => {
    try {
      // Create JWT token
      const token = jwt.sign(
        { 
          id: req.user._id, 
          name: req.user.name, 
          email: req.user.email 
        },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
      );
      
      // Set cookie with secure flags
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 24 * 60 * 60 * 1000 // 1 day
      });

      logger.info(`User ${req.user.email} authenticated via GitHub`);
      res.redirect('/onboarding');
    } catch (err) {
      logger.error('GitHub callback error: %o', err);
      res.redirect('/login');
    }
  }
);

// Google OAuth Routes
authRouter.get('/google', 
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

authRouter.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    try {
      // Create JWT token
      const token = jwt.sign(
        { 
          id: req.user._id, 
          name: req.user.name, 
          email: req.user.email 
        },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
      );
      
      // Set cookie with secure flags
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 24 * 60 * 60 * 1000 // 1 day
      });

      logger.info(`User ${req.user.email} authenticated via Google`);
      res.redirect('/onboarding');
    } catch (err) {
      logger.error('Google callback error: %o', err);
      res.redirect('/login');
    }
  }
);

// Logout route (optional)
authRouter.get('/logout', (req, res) => {
  res.clearCookie('token');
  req.logout((err) => {
    if (err) {
      logger.error('Logout error: %o', err);
    }
    res.redirect('/');
  });
});

module.exports = authRouter;
