import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import Notification from '../models/Notification.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (request, response, next) => {
  try {
    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ user: request.user.id }).populate('transaction', 'reference').sort({ createdAt: -1 }).limit(100).lean(),
      Notification.countDocuments({ user: request.user.id, readAt: null })
    ]);
    response.json({ notifications, unreadCount });
  } catch (error) { next(error); }
});

router.patch('/read-all', async (request, response, next) => {
  try {
    await Notification.updateMany({ user: request.user.id, readAt: null }, { $set: { readAt: new Date() } });
    response.json({ message: 'All notifications marked as read.' });
  } catch (error) { next(error); }
});

router.patch('/:id/read', async (request, response, next) => {
  try {
    const notification = await Notification.findOneAndUpdate({ _id: request.params.id, user: request.user.id }, { $set: { readAt: new Date() } }, { new: true });
    if (!notification) return response.status(404).json({ message: 'Notification not found.' });
    response.json({ notification });
  } catch (error) { next(error); }
});

export default router;
