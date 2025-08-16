import express from 'express';
import { getConfig, updateConfig, getGoogleMapsApiKey, getGoogleMapsMapId } from '../controllers/config.controller';
import { getReservas, createReserva, deleteReserva, confirmarReserva, confirmarReservaDefinitiva, addReservaAdmin, confirmarReservaAdmin, cancelarReserva, cancelarReservaPorToken } from '../controllers/reservas.controller';
import { deleteFechaBloqueada, getFechasBloqueadas, addFechaBloqueada } from '../controllers/bloqueo.controller';
import { getServicios } from '../controllers/servicios.controller';
import { loginByEmail } from '../controllers/auth.controller'; // Importar el nuevo controlador
import { initializeBusiness } from '../controllers/business.controller'; // Importar el nuevo controlador de negocio
import { authenticateAdmin } from '../middleware/auth.middleware'; // Importar el middleware de autenticación
import * as superAdminController from '../controllers/super-admin.controller';
import { superAdminAuth } from '../middleware/super-admin-auth.middleware';
import { uploadImage, uploadImages } from '../controllers/upload.controller';
import multer = require('multer');

const upload = multer({ storage: multer.memoryStorage() });
const router = express.Router();

// Rutas de autenticación de administrador
router.post('/admin/login-by-email', loginByEmail);

// Rutas de gestión de negocio
router.post('/business/initialize', authenticateAdmin, initializeBusiness);

// Configuración del negocio (GET es público, PUT protegido)
router.get('/config', getConfig);
router.put('/config', authenticateAdmin, updateConfig);
router.get('/config/maps-api-key', getGoogleMapsApiKey);
router.get('/config/maps-map-id', getGoogleMapsMapId);

// Rutas de subida de imágenes
router.post('/upload/image', authenticateAdmin, upload.single('image'), uploadImage);
router.post('/upload/images', authenticateAdmin, upload.array('images', 10), uploadImages);

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
router.patch('/reservas/:id/cancelar', authenticateAdmin, cancelarReserva);
router.post('/reservas/cancelar-por-token/:token', cancelarReservaPorToken);

// Fechas bloqueadas (GET es público, POST/DELETE protegidos)
router.get('/bloqueo', getFechasBloqueadas);
router.post('/bloqueo', authenticateAdmin, addFechaBloqueada);
router.delete('/bloqueo/:fecha', authenticateAdmin, deleteFechaBloqueada);

// --- Super Admin Routes ---
router.post('/super-admin/login', superAdminController.superAdminLogin);

// Business Management (protected by super-admin auth)
router.get('/super-admin/businesses', superAdminAuth, superAdminController.getAllBusinesses);
router.post('/super-admin/businesses', superAdminAuth, superAdminController.createBusiness);
router.delete('/super-admin/businesses/:id', superAdminAuth, superAdminController.deleteBusiness);
router.post('/super-admin/businesses/:id/reset-password', superAdminAuth, superAdminController.resetAdminPassword);

export default router;
