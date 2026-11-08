import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/me', (request, response) => response.json({ user: {
  id: request.user.id,
  name: request.user.name,
  email: request.user.email,
  phone: request.user.phone,
  homeCountry: request.user.homeCountry,
  createdAt: request.user.createdAt
} }));

router.patch('/me', async (request, response, next) => {
  try {
    const { name, phone, homeCountry } = request.body;
    if (name !== undefined && (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 80)) return response.status(400).json({ message: 'Name must be between 2 and 80 characters.' });
    if (name !== undefined) request.user.name = name.trim();
    if (typeof phone === 'string') request.user.phone = phone.trim().slice(0, 30);
    if (typeof homeCountry === 'string') request.user.homeCountry = homeCountry.trim().slice(0, 60);
    await request.user.save();
    response.json({ user: { id: request.user.id, name: request.user.name, email: request.user.email, phone: request.user.phone, homeCountry: request.user.homeCountry, createdAt: request.user.createdAt } });
  } catch (error) { next(error); }
});

export default router;
