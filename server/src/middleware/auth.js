import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export async function requireAuth(request, response, next) {
  try {
    const token = request.headers.authorization?.startsWith('Bearer ')
      ? request.headers.authorization.slice(7)
      : null;
    if (!token) return response.status(401).json({ message: 'Sign in to continue.' });
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub);
    if (!user) return response.status(401).json({ message: 'Your session is no longer valid.' });
    request.user = user;
    next();
  } catch {
    response.status(401).json({ message: 'Your session is invalid or expired.' });
  }
}
