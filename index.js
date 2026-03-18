// Load environment variables FIRST, before any module that depends on them
const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const path = require('path');
const jwt = require('jsonwebtoken');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const compression = require('compression');
const csurf = require('csurf');
const passport = require('./config/passport');
const logger = require('./utils/logger');
const connectionHandler = require('./connection');
const verifyToken = require('./middlewares/auth');
const projectRouter = require('./routes/project');
const userRouter = require('./routes/user');
const authRouter = require('./routes/auth');
const Project = require('./models/project');
const User = require('./models/user');
const app = express();

// ✅ Use Render’s dynamic port or fallback to 8000 for local use
const PORT = process.env.PORT || 8000;

// --- EJS Setup ---
app.set('view engine', 'ejs');
app.set('views', path.resolve('./views'));

// --- Middleware ---
// Security & performance
if (!process.env.JWT_SECRET) {
  console.warn('[WARN] JWT_SECRET is not set. Authentication will fail in production.');
}

// Configure Helmet with custom CSP to allow Bootstrap CDN and local scripts
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", 'https://cdn.jsdelivr.net'],
      styleSrc: ["'self'", 'https://cdn.jsdelivr.net', "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
    },
  },
}));
app.use(compression());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Session management for Passport.js OAuth
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key', // Use SESSION_SECRET from .env
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // Use HTTPS in production
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Passport initialization for OAuth
app.use(passport.initialize());
app.use(passport.session());

// CSRF protection for state-changing requests (uses cookie to store token)
const csrfProtection = csurf({ cookie: true });
// Apply CSRF protection globally so GET pages can obtain a token for forms
app.use(csrfProtection);

// Attach CSRF token (when available) to views
app.use((req, res, next) => {
  try {
    res.locals.csrfToken = req.csrfToken();
  } catch (e) {
    res.locals.csrfToken = null;
  }
  next();
});

// --- Middleware to check token and set res.locals.user ---
app.use((req, res, next) => {
  const token = req.cookies.token;
  res.locals.user = null;

  if (token && process.env.JWT_SECRET) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      res.locals.user = decoded;
    } catch (err) {
      res.clearCookie('token');
    }
  }
  next();
});

// --- ROUTES ---
app.get('/', verifyToken, async (req, res) => {
  if (res.locals.user) {
    try {
      // Fetch real user statistics
      const userId = res.locals.user.id;
      const projectsCreated = await Project.countDocuments({ createdBy: userId });
      const projectsJoined = await Project.countDocuments({ approved_users: userId });
      const completedProjects = await Project.countDocuments({
        $or: [
          { createdBy: userId, status: 'FINISHED' },
          { approved_users: userId, status: 'FINISHED' }
        ]
      });

      // Fetch active projects (both created and joined)
      const activeProjectsCreated = await Project.find({
        createdBy: userId,
        status: { $in: ['OPEN', 'IN_PROGRESS'] }
      }).select('title domain status createdOn').limit(3).sort({ createdOn: -1 });

      const activeProjectsJoined = await Project.find({
        approved_users: userId,
        status: { $in: ['OPEN', 'IN_PROGRESS'] }
      }).select('title domain status createdOn').populate('createdBy', 'email').limit(3).sort({ createdOn: -1 });

      const stats = {
        projectsCreated,
        projectsJoined,
        completedProjects
      };

      res.render('dashboard', { 
        user: res.locals.user, 
        stats,
        activeProjectsCreated,
        activeProjectsJoined,
        currentPath: req.path,
        pageTitle: `${res.locals.user.name}'s Dashboard - ProjectMate | Track Your Collaborations`,
        metaDescription: `View your project statistics, active collaborations, and team performance on ProjectMate. Track created projects, joined projects, and completed collaborations.`,
        ogTitle: 'Dashboard - ProjectMate',
        ogDescription: 'View your project statistics, active projects, and collaborations on ProjectMate.',
        ogUrl: 'https://projectmate.com/',
        ogType: 'website',
        canonicalUrl: 'https://projectmate.com/',
        breadcrumbs: [
          { name: 'Home', url: '/' },
          { name: 'Dashboard', url: '/' }
        ],
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'WebApplication',
          'name': 'ProjectMate',
          'description': 'Collaborate with creators, developers, and innovators on amazing projects',
          'url': 'https://projectmate.com',
          'applicationCategory': 'ProductionApplication'
        }
      });
    } catch (err) {
      logger.error('Error fetching dashboard stats: %o', err);
      res.render('dashboard', {
        user: res.locals.user,
        stats: { projectsCreated: 0, projectsJoined: 0, completedProjects: 0 },
        activeProjectsCreated: [],
        activeProjectsJoined: [],
        currentPath: req.path,
        pageTitle: `Dashboard - ProjectMate | Track Your Collaborations`,
        metaDescription: `View your project statistics, active collaborations, and team performance on ProjectMate. Track created projects, joined projects, and completed collaborations.`,
        ogTitle: 'Dashboard - ProjectMate',
        ogDescription: 'View your project statistics, active projects, and collaborations on ProjectMate.',
        ogUrl: 'https://projectmate.com/',
        ogType: 'website',
        canonicalUrl: 'https://projectmate.com/',
        breadcrumbs: [
          { name: 'Home', url: '/' },
          { name: 'Dashboard', url: '/' }
        ],
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'WebApplication',
          'name': 'ProjectMate',
          'description': 'Collaborate with creators, developers, and innovators on amazing projects',
          'url': 'https://projectmate.com',
          'applicationCategory': 'ProductionApplication'
        }
      });
    }
  } else {
    res.render('home', { 
      currentPath: req.path,
      pageTitle: 'ProjectMate - Collaborate Like a Pro | Find & Build Amazing Projects Together',
      metaDescription: 'Connect with creators, developers, and innovators on ProjectMate. Find projects matched to your skills, collaborate with vetted professionals, and grow your portfolio.',
      ogTitle: 'ProjectMate - Collaborate Like a Pro',
      ogDescription: 'Connect with creators, developers, and innovators to build amazing projects together.',
      ogUrl: 'https://projectmate.com/',
      ogType: 'website',
      canonicalUrl: 'https://projectmate.com/',
      breadcrumbs: [
        { name: 'Home', url: '/' }
      ],
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        'name': 'ProjectMate',
        'description': 'Connect with creators, developers, and innovators to build amazing projects together.',
        'url': 'https://projectmate.com',
        'applicationCategory': 'ProductionApplication',
        'featureList': ['Project collaboration', 'Skill-based matching', 'Real-time notifications']
      }
    });
  }
});

app.get('/login', (req, res) => {
  res.render('login', { error: null, currentPath: req.path });
});

app.get('/signup', (req, res) => {
  res.render('signup', { error: null, currentPath: req.path });
});

// Support & Legal Pages
app.get('/help', (req, res) => {
  res.render('help', { 
    currentPath: req.path,
    pageTitle: 'Help & Support - ProjectMate FAQ | Get Answers & Troubleshooting',
    metaDescription: 'Find answers to frequently asked questions about ProjectMate. Get help with account setup, project collaboration, messaging, payments, and more.',
    ogTitle: 'Help & Support - ProjectMate',
    ogDescription: 'Get help with ProjectMate features, troubleshooting, and support.',
    ogUrl: 'https://projectmate.com/help',
    ogType: 'website',
    canonicalUrl: 'https://projectmate.com/help',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Help', url: '/help' }
    ]
  });
});

app.get('/privacy', (req, res) => {
  res.render('privacy', { 
    currentPath: req.path,
    pageTitle: 'Privacy Policy - ProjectMate | Data Protection & Your Rights',
    metaDescription: 'Learn how ProjectMate protects your personal data, how we use information, and your privacy rights. GDPR compliant privacy policy.',
    ogTitle: 'Privacy Policy - ProjectMate',
    ogDescription: 'Read our privacy policy to understand how we protect your data.',
    ogUrl: 'https://projectmate.com/privacy',
    ogType: 'website',
    canonicalUrl: 'https://projectmate.com/privacy',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Privacy', url: '/privacy' }
    ]
  });
});

app.get('/terms', (req, res) => {
  res.render('terms', { 
    currentPath: req.path,
    pageTitle: 'Terms of Service - ProjectMate | User Agreement & Policies',
    metaDescription: 'Read ProjectMate terms of service, user agreements, acceptable use policy, and dispute resolution procedures. Updated and legally binding.',
    ogTitle: 'Terms of Service - ProjectMate',
    ogDescription: 'Review the terms of service for using ProjectMate.',
    ogUrl: 'https://projectmate.com/terms',
    ogType: 'website',
    canonicalUrl: 'https://projectmate.com/terms',
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Terms', url: '/terms' }
    ]
  });
});

app.get('/onboarding', verifyToken, (req, res) => {
  res.render('onboarding', { user: res.locals.user, currentPath: req.path });
});

// --- Sitemap Route (P0 SEO) ---
app.get('/sitemap.xml', async (req, res) => {
  try {
    const baseUrl = process.env.BASE_URL || 'https://projectmate.com';
    
    // Static pages
    const staticPages = [
      { path: '/', priority: 1.0, changefreq: 'daily' },
      { path: '/project/find', priority: 0.9, changefreq: 'daily' },
      { path: '/help', priority: 0.5, changefreq: 'weekly' },
      { path: '/privacy', priority: 0.3, changefreq: 'monthly' },
      { path: '/terms', priority: 0.3, changefreq: 'monthly' },
    ];

    // Fetch all public projects (status: OPEN or IN_PROGRESS)
    const projects = await Project.find({ 
      status: { $in: ['OPEN', 'IN_PROGRESS'] } 
    }).select('_id updatedAt createdOn').lean();

    // Fetch all users for profile pages
    const users = await User.find({}).select('_id updatedAt').lean();

    // Build sitemap XML
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    // Add static pages
    staticPages.forEach(page => {
      xml += '  <url>\n';
      xml += `    <loc>${baseUrl}${page.path}</loc>\n`;
      xml += `    <priority>${page.priority}</priority>\n`;
      xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
      xml += '  </url>\n';
    });

    // Add project pages
    projects.forEach(project => {
      const lastMod = (project.updatedAt || project.createdOn || new Date())
        .toISOString()
        .split('T')[0];
      xml += '  <url>\n';
      xml += `    <loc>${baseUrl}/project/show/${project._id}</loc>\n`;
      xml += `    <lastmod>${lastMod}</lastmod>\n`;
      xml += '    <priority>0.8</priority>\n';
      xml += '    <changefreq>weekly</changefreq>\n';
      xml += '  </url>\n';
    });

    // Add user profile pages
    users.forEach(user => {
      const lastMod = (user.updatedAt || new Date())
        .toISOString()
        .split('T')[0];
      xml += '  <url>\n';
      xml += `    <loc>${baseUrl}/user/${user._id}</loc>\n`;
      xml += `    <lastmod>${lastMod}</lastmod>\n`;
      xml += '    <priority>0.7</priority>\n';
      xml += '    <changefreq>monthly</changefreq>\n';
      xml += '  </url>\n';
    });

    xml += '</urlset>';

    // Send XML response
    res.set('Content-Type', 'application/xml');
    res.send(xml);
  } catch (error) {
    logger.error('Sitemap generation error: %o', error);
    res.status(500).send('Error generating sitemap');
  }
});

// --- Routers ---
app.use('/auth', authRouter);
app.use('/project', projectRouter);
app.use('/user', userRouter);

// --- Database connection + Start Server ---
connectionHandler();
app.listen(PORT, '0.0.0.0', () => logger.info(`🚀 Server running on port ${PORT}`));

// Centralized error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error: %o', err);
  const status = err.status || 500;
  if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('application/json') !== -1)) {
    return res.status(status).json({ error: err.message || 'Internal Server Error' });
  }
  res.status(status);
  res.render('error', { error: err, currentPath: req.path });
});
