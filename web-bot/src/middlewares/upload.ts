import multer from 'multer';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('uploadMiddleware');

export const uploadMemorySinglePdf = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB máximo
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      logger.debug({ fileName: file.originalname, fileSize: file.size }, 'PDF válido recibido');
      cb(null, true);
    } else {
      logger.warn({ fileName: file.originalname, mimetype: file.mimetype }, 'Archivo rechazado: no es PDF');
      cb(new Error('Solo se permiten archivos PDF'));
    }
  },
}).single('file');
