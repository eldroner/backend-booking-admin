import express from 'express';
import { getConfig, updateConfig } from '../controllers/config.controller';
import { getReservas, createReserva, deleteReserva, confirmarReserva, confirmarReservaDefinitiva, addReservaAdmin, confirmarReservaAdmin } from '../controllers/reservas.controller';
import { getFechasBloqueadas, addFechaBloqueada, deleteFechaBloqueada } from '../controllers/bloqueo.controller';
import { getServicios } from '../controllers/servicios.controller';
import { loginByEmail } from '../controllers/auth.controller'; // Importar el nuevo controlador
import { initializeBusiness } from '../controllers/business.controller'; // Importar el nuevo controlador de negocio
import { authenticateAdmin } from '../middleware/auth.middleware'; // Importar el middleware de autenticación

const router = express.Router();

// Rutas de autenticación de administrador
router.post('/admin/login-by-email', loginByEmail);

// Rutas de gestión de negocio
router.post('/business/initialize', authenticateAdmin, initializeBusiness);

// Configuración del negocio (GET es público, PUT protegido)
router.get('/config', getConfig);
router.put('/config', authenticateAdmin, updateConfig);

// Servicios (públicos)
router.get('/servicios', getServicios);

// Reservas (algunas protegidas)
router.get('/reservas', getReservas);
router.post('/reservas', createReserva);
router.post('/reservas/admin', authenticateAdmin, addReservaAdmin);

router.delete('/reservas/:id', deleteReserva);
router.get('/reservas/confirmar/:token', confirmarReserva);
router.post('/reservas/confirmar-definitiva/:token', confirmarReservaDefinitiva);
router.put('/reservas/:id/confirm', authenticateAdmin, confirmarReservaAdmin);

// Fechas bloqueadas (GET es público, POST/DELETE protegidos)
router.get('/bloqueo', getFechasBloqueadas);
router.post('/bloqueo', authenticateAdmin, addFechaBloqueada);
router.delete('/bloqueo/:fecha', authenticateAdmin, deleteFechaBloqueada);

export default router;
