import express from 'express';
const router = express.Router();
import pressingSessionController from "../controllers/pressingSessionController.js"

// GET /api/pressing-sessions - Get all pressing sessions
router.get('/', pressingSessionController.getAllPressingSessions);

// GET /api/pressing-sessions/:id - Get pressing session by ID
router.get('/:id', pressingSessionController.getPressingSessionById);

// POST /api/pressing-sessions - Start new pressing session
router.post('/', pressingSessionController.startPressingSession);

// PUT /api/pressing-sessions/:id/finish - Finish pressing session
router.put('/:id/finish', pressingSessionController.finishPressingSession);

export default router;
