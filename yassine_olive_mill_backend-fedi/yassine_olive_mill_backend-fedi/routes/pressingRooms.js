import express from 'express';
const router = express.Router();

import pressingRoomController from "../controllers/pressingRoomController.js";

// GET /api/pressing-rooms - list rooms with derived status
router.get('/', pressingRoomController.getAllPressingRooms);

// GET /api/pressing-rooms/:id - get room
router.get('/:id', pressingRoomController.getPressingRoomById);

// POST /api/pressing-rooms - create
router.post('/', pressingRoomController.createPressingRoom);

// PUT /api/pressing-rooms/:id - update
router.put('/:id', pressingRoomController.updatePressingRoom);

// DELETE /api/pressing-rooms/:id - delete
router.delete('/:id', pressingRoomController.deletePressingRoom);

export default router;


