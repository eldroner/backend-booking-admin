import express from 'express';
import { getConfig, updateConfig, getGoogleMapsApiKey, getGoogleMapsMapId } from '../controllers/config.controller';
import { getReservas, createReserva, deleteReserva, confirmarReserva, confirmarReservaDefinitiva, addReservaAdmin, confirmarReservaAdmin, cancelarReserva, cancelarReservaPorToken, updateReserva, getStatistics, checkDisponibilidad, getHolidays } from '../controllers/reservas.controller';
import { deleteFechaBloqueada, getFechasBloqueadas, addFechaBloqueada } from '../controllers/bloqueo.controller';
import { getServicios, addServicio, updateServicio, deleteServicio } from '../controllers/servicios.controller';
import { createCheckoutSession, getCheckoutSessionStatus, cancelSubscription, getSubscriptionDetails, revertSubscriptionCancellation } from '../controllers/payment.controller';
import { sendBookingConfirmation, sendAdminNotification } from '../controllers/email.controller'; // Importar el nuevo controlador de email
import { loginByEmail } from '../controllers/auth.controller'; // Importar el nuevo controlador
import { initializeBusiness } from '../controllers/business.controller'; // Importar el nuevo controlador de negocio
import { authenticateAdmin } from '../middleware/auth.middleware'; // Importar el middleware de autenticación
import * as superAdminController from '../controllers/super-admin.controller';
import * as adminController from '../controllers/admin.controller';
import { superAdminAuth } from '../middleware/super-admin-auth.middleware';
import { uploadImage, uploadImages } from '../controllers/upload.controller';
import multer = require('multer');

import { getStaff, addStaff, updateStaff, deleteStaff } from '../controllers/staff.controller';
import { submitRating, getRatingInfo } from '../controllers/rating.controller';

/** Límite por archivo (coincide con lo recomendado en Nginx: client_max_body_size). */
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 10 }
});
const router = express.Router();

// Rutas de autenticación de administrador
router.post('/admin/login-by-email', loginByEmail);

// Rutas de gestión de cuenta de administrador
router.put('/admin/update-email', authenticateAdmin, adminController.updateAdminEmail);
router.put('/admin/update-password', authenticateAdmin, adminController.updateAdminPassword);

// Rutas de gestión de negocio
router.post('/business/initialize', authenticateAdmin, initializeBusiness);

// Configuración del negocio (GET es público, PUT protegido)
router.get('/config', getConfig);
router.put('/config', authenticateAdmin, updateConfig);
router.get('/config/maps-api-key', getGoogleMapsApiKey);
router.get('/config/maps-map-id', getGoogleMapsMapId);

// --- Payment & Subscription Routes ---
router.post('/payments/create-checkout-session', createCheckoutSession);
router.get('/payments/session-status', getCheckoutSessionStatus);
router.post('/subscription/cancel', authenticateAdmin, cancelSubscription);
router.post('/subscription/revert-cancellation', authenticateAdmin, revertSubscriptionCancellation);
router.get('/subscription/details', authenticateAdmin, getSubscriptionDetails);

// --- Email Routes ---
router.post('/email/send-booking-confirmation', sendBookingConfirmation);
router.post('/email/send-admin-notification', sendAdminNotification);


// Rutas de subida de imágenes
router.post('/upload/image', authenticateAdmin, upload.single('image'), uploadImage);
router.post('/upload/images', authenticateAdmin, upload.array('images', 10), uploadImages);

// Servicios
router.get('/servicios', getServicios);
router.post('/servicios', authenticateAdmin, addServicio);
router.put('/servicios/:id', authenticateAdmin, updateServicio);
router.delete('/servicios/:id', authenticateAdmin, deleteServicio);

// Personal (Equipo)
router.get('/staff', getStaff);
router.post('/staff', authenticateAdmin, addStaff);
router.put('/staff/:id', authenticateAdmin, updateStaff);
router.delete('/staff/:id', authenticateAdmin, deleteStaff);

// Valoraciones
router.get('/rating/info/:token', getRatingInfo);
router.post('/rating/submit/:token', submitRating);

// Reservas (algunas protegidas)
router.get('/reservas', getReservas);
router.get('/reservas/statistics', authenticateAdmin, getStatistics);
router.get('/disponibilidad', checkDisponibilidad);
router.get('/holidays', getHolidays);
router.post('/reservas', createReserva);
router.post('/reservas/admin', authenticateAdmin, addReservaAdmin);

router.put('/reservas/:id', authenticateAdmin, updateReserva);
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
