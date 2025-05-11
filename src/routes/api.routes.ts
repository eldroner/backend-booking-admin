// backend/src/routes/api.routes.ts
import express from 'express';
import { getConfig, saveConfig, updateConfig } from '../controllers/config.controller';
import { getReservas, createReserva } from '../controllers/reservas.controller';


const router = express.Router();

// Configuración del negocio
router.get('/config', getConfig);    // Ruta final: /api/config
router.post('/config', saveConfig);  // Ruta final: /api/config
router.put('/config', updateConfig); // Nueva ruta PUT

// Reservas
router.get('/reservas', getReservas);    // Ruta final: /api/reservas
router.post('/reservas', createReserva); // Ruta final: /api/reservas

export default router;