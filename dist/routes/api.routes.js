"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const config_controller_1 = require("../controllers/config.controller");
const reservas_controller_1 = require("../controllers/reservas.controller");
const bloqueo_controller_1 = require("../controllers/bloqueo.controller");
const servicios_controller_1 = require("../controllers/servicios.controller");
const auth_controller_1 = require("../controllers/auth.controller"); // Importar el nuevo controlador
const business_controller_1 = require("../controllers/business.controller"); // Importar el nuevo controlador de negocio
const auth_middleware_1 = require("../middleware/auth.middleware"); // Importar el middleware de autenticación
const router = express_1.default.Router();
// Rutas de autenticación de administrador
router.post('/admin/login-by-email', auth_controller_1.loginByEmail);
// Rutas de gestión de negocio
router.post('/business/initialize', auth_middleware_1.authenticateAdmin, business_controller_1.initializeBusiness);
// Configuración del negocio (GET es público, PUT protegido)
router.get('/config', config_controller_1.getConfig);
router.put('/config', auth_middleware_1.authenticateAdmin, config_controller_1.updateConfig);
// Servicios (públicos)
router.get('/servicios', servicios_controller_1.getServicios);
// Reservas (algunas protegidas)
router.get('/reservas', reservas_controller_1.getReservas);
router.post('/reservas', reservas_controller_1.createReserva);
router.post('/reservas/admin', auth_middleware_1.authenticateAdmin, reservas_controller_1.addReservaAdmin);
router.delete('/reservas/:id', reservas_controller_1.deleteReserva);
router.get('/reservas/confirmar/:token', reservas_controller_1.confirmarReserva);
router.post('/reservas/confirmar-definitiva/:token', reservas_controller_1.confirmarReservaDefinitiva);
router.put('/reservas/:id/confirm', auth_middleware_1.authenticateAdmin, reservas_controller_1.confirmarReservaAdmin);
router.patch('/reservas/:id/cancelar', auth_middleware_1.authenticateAdmin, reservas_controller_1.cancelarReserva);
router.post('/reservas/cancelar-por-token/:token', reservas_controller_1.cancelarReservaPorToken);
// Fechas bloqueadas (GET es público, POST/DELETE protegidos)
router.get('/bloqueo', bloqueo_controller_1.getFechasBloqueadas);
router.post('/bloqueo', auth_middleware_1.authenticateAdmin, bloqueo_controller_1.addFechaBloqueada);
router.delete('/bloqueo/:fecha', auth_middleware_1.authenticateAdmin, bloqueo_controller_1.deleteFechaBloqueada);
exports.default = router;
