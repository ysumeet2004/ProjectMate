// // const jwt = require('jsonwebtoken');

// // function verifyToken(req, res, next) {
// //   const token = req.cookies.token;

// //   if (!token) {
// //     return res.redirect('/user/login');
// //   }

// //   try {
// //     const decoded = jwt.verify(token, process.env.JWT_SECRET);
// //     req.user = decoded;
// //     res.locals.user = decoded;
// //     next();
// //   } catch (err) {
// //     console.error("JWT Verification Error:", err.message);
// //     return res.redirect('/user/login');
// //   }
// // }

// // module.exports = verifyToken;

// const jwt = require('jsonwebtoken');

// function verifyToken(req, res, next) {
//   const token = req.cookies.token;

//   if (!token) {
//     console.log(`[AUTH] No token found for ${req.originalUrl}`);
//     return res.redirect('/user/login');
//   }

//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     req.user = decoded;
//     res.locals.user = decoded;
//     next();
//   } catch (err) {
//     console.error(`[AUTH] Invalid token for ${req.originalUrl}:`, err.message);
//     return res.redirect('/user/login');
//   }
// }

// module.exports = verifyToken;
const jwt = require('jsonwebtoken');
const userModel = require('../models/user');

module.exports = async function verifyToken(req, res, next) {
  try {
    const token = req.cookies.token || req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      console.log('❌ No token found');
      return res.redirect('/login');
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded || !decoded.id) {
      console.log('❌ Invalid token payload');
      return res.redirect('/login');
    }

    // ✅ Fetch user from DB and attach to req
    const user = await userModel.findById(decoded.id);
    if (!user) {
      console.log('❌ No user found for this token');
      return res.redirect('/login');
    }

    req.user = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
    };

    next();
  } catch (err) {
    console.error('🔥 Token verification error:', err.message);
    res.redirect('/login');
  }
};
