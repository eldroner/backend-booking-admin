"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
const superAdminController = __importStar(require("../controllers/super-admin.controller"));
const super_admin_auth_middleware_1 = require("../middleware/super-admin-auth.middleware");
const upload_controller_1 = require("../controllers/upload.controller");
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });
const router = express_1.default.Router();
// Rutas de autenticación de administrador
router.post('/admin/login-by-email', auth_controller_1.loginByEmail);
// Rutas de gestión de negocio
router.post('/business/initialize', auth_middleware_1.authenticateAdmin, business_controller_1.initializeBusiness);
// Configuración del negocio (GET es público, PUT protegido)
router.get('/config', config_controller_1.getConfig);
router.put('/config', auth_middleware_1.authenticateAdmin, config_controller_1.updateConfig);
router.get('/config/maps-api-key', config_controller_1.getGoogleMapsApiKey);
router.get('/config/maps-map-id', config_controller_1.getGoogleMapsMapId);
// Rutas de subida de imágenes
router.post('/upload/image', auth_middleware_1.authenticateAdmin, upload.single('image'), upload_controller_1.uploadImage);
router.post('/upload/images', auth_middleware_1.authenticateAdmin, upload.array('images', 10), upload_controller_1.uploadImages);
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
// --- Super Admin Routes ---
router.post('/super-admin/login', superAdminController.superAdminLogin);
// Business Management (protected by super-admin auth)
router.get('/super-admin/businesses', super_admin_auth_middleware_1.superAdminAuth, superAdminController.getAllBusinesses);
router.post('/super-admin/businesses', super_admin_auth_middleware_1.superAdminAuth, superAdminController.createBusiness);
router.delete('/super-admin/businesses/:id', super_admin_auth_middleware_1.superAdminAuth, superAdminController.deleteBusiness);
router.post('/super-admin/businesses/:id/reset-password', super_admin_auth_middleware_1.superAdminAuth, superAdminController.resetAdminPassword);
exports.default = router;
