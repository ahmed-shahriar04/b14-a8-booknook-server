import jwt from 'jsonwebtoken';

export const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).json({ success: false, message: 'Unauthorized access: No token provided' });
  }

  const token = authorization.startsWith('Bearer ') ? authorization.split(' ')[1] : authorization;

  jwt.verify(token, process.env.JWT_SECRET || 'booknook_jwt_super_secret_express_2026', (err, decoded) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Forbidden access: Invalid or expired token' });
    }
    req.user = decoded;
    next();
  });
};

