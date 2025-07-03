import express from 'express';
import { getConfig, updateConfig } from '../controllers/config.controller';
import { getReservas, createReserva, deleteReserva, confirmarReserva, confirmarReservaDefinitiva, addReservaAdmin } from '../controllers/reservas.controller';
import { getFechasBloqueadas, addFechaBloqueada, deleteFechaBloqueada } from '../controllers/bloqueo.controller';

const router = express.Router();

// Configuración del negocio
router.get('/config', getConfig);
router.put('/config', updateConfig); // Solo necesitamos PUT para crear/actualizar

// Reservas
router.get('/reservas', getReservas);
router.post('/reservas', createReserva);
router.post('/reservas/admin', addReservaAdmin);

router.delete('/reservas/:id', deleteReserva);
router.get('/reservas/confirmar/:token', confirmarReserva);
router.post('/reservas/confirmar-definitiva/:token', confirmarReservaDefinitiva);

// Fechas bloqueadas
router.get('/bloqueo', getFechasBloqueadas);
router.post('/bloqueo', addFechaBloqueada);
router.delete('/bloqueo/:fecha', deleteFechaBloqueada);

export default router;