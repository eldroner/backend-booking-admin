import express from 'express';
import { getConfig, updateConfig } from '../controllers/config.controller';
import { getReservas, createReserva, deleteReserva, confirmarReserva, confirmarReservaDefinitiva, addReservaAdmin } from '../controllers/reservas.controller';

const router = express.Router();

// Configuración del negocio
router.get('/config', getConfig);
router.put('/config', updateConfig); // Solo necesitamos PUT para crear/actualizar

// Reservas
router.get('/reservas', getReservas);
router.post('/reservas', createReserva);
router.post('/reservas/admin', addReservaAdmin);
router.post('/reservas/admin', createReserva);
router.delete('/reservas/:id', deleteReserva);
router.get('/reservas/confirmar/:token', confirmarReserva);
router.post('/reservas/confirmar-definitiva/:token', confirmarReservaDefinitiva);

export default router;