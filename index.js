const express = require('express');
const path = require('path');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const connectionHandler = require('./connection');
const verifyToken = require('./middlewares/auth');
const projectRouter = require('./routes/project');
const userRouter = require('./routes/user');

dotenv.config();
const app = express();

// ✅ Use Render’s dynamic port or fallback to 8000 for local use
const PORT = process.env.PORT || 8000;

// --- EJS Setup ---
app.set('view engine', 'ejs');
app.set('views', path.resolve('./views'));

// --- Middleware ---
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

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
app.get('/', verifyToken, (req, res) => {
  if (res.locals.user) res.render('dashboard', { user: res.locals.user });
  else res.render('home');
});

app.get('/login', (req, res) => {
  res.render('login', { error: null });
});

app.get('/signup', (req, res) => {
  res.render('signup', { error: null });
});

// --- Routers ---
app.use('/project', projectRouter);
app.use('/user', userRouter);

// --- Database connection + Start Server ---
connectionHandler();
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server running on port ${PORT}`));
