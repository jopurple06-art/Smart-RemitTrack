import { Router } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const publicUser = (user) => ({ id: user.id, name: user.name, email: user.email, phone: user.phone, homeCountry: user.homeCountry, createdAt: user.createdAt });
const signToken = (user) => jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });

router.post('/register', async (request, response, next) => {
  try {
    const { name, email, password } = request.body;
    if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 80) return response.status(400).json({ message: 'Name must be between 2 and 80 characters.' });
    if (typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email)) return response.status(400).json({ message: 'Enter a valid email address.' });
    if (typeof password !== 'string' || password.length < 8) return response.status(400).json({ message: 'Password must be at least 8 characters.' });
    if (await User.exists({ email: email.toLowerCase().trim() })) return response.status(409).json({ message: 'An account with this email already exists.' });
    const user = new User({ name: name.trim(), email: email.trim().toLowerCase() });
    await user.setPassword(password);
    await user.save();
    response.status(201).json({ token: signToken(user), user: publicUser(user) });
  } catch (error) { next(error); }
});

router.post('/login', async (request, response, next) => {
  try {
    const { email, password } = request.body;
    if (typeof email !== 'string' || typeof password !== 'string') return response.status(400).json({ message: 'Email and password are required.' });
    const user = await User.findOne({ email: email.trim().toLowerCase() }).select('+passwordHash');
    if (!user || !(await user.verifyPassword(password))) return response.status(401).json({ message: 'Email or password is incorrect.' });
    response.json({ token: signToken(user), user: publicUser(user) });
  } catch (error) { next(error); }
});

router.get('/me', requireAuth, (request, response) => response.json({ user: publicUser(request.user) }));

export default router;
