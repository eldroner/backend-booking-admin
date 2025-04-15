import { Router } from 'express';
import { getConfig } from '../controllers/config.controller';

const router = Router();

router.get('/config', getConfig);

export default router;