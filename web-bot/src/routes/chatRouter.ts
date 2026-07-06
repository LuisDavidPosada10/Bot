import { Router } from 'express';
import { uploadMemorySinglePdf } from '../middlewares/upload.js';
import { handleChat } from '../controllers/chatController.js';

const chatRouter = Router();

chatRouter.post('/chat', uploadMemorySinglePdf, handleChat);

export default chatRouter;
