"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const config_controller_1 = require("../controllers/config.controller");
const reservas_controller_1 = require("../controllers/reservas.controller");
const bloqueo_controller_1 = require("../controllers/bloqueo.controller");
const router = express_1.default.Router();
// Configuración del negocio
router.get('/config', config_controller_1.getConfig);
router.put('/config', config_controller_1.updateConfig); // Solo necesitamos PUT para crear/actualizar
// Reservas
router.get('/reservas', reservas_controller_1.getReservas);
router.post('/reservas', reservas_controller_1.createReserva);
router.post('/reservas/admin', reservas_controller_1.addReservaAdmin);
router.delete('/reservas/:id', reservas_controller_1.deleteReserva);
router.get('/reservas/confirmar/:token', reservas_controller_1.confirmarReserva);
router.post('/reservas/confirmar-definitiva/:token', reservas_controller_1.confirmarReservaDefinitiva);
router.put('/reservas/:id/confirm', reservas_controller_1.confirmarReservaAdmin);
// Fechas bloqueadas
router.get('/bloqueo', bloqueo_controller_1.getFechasBloqueadas);
router.post('/bloqueo', bloqueo_controller_1.addFechaBloqueada);
router.delete('/bloqueo/:fecha', bloqueo_controller_1.deleteFechaBloqueada);
exports.default = router;
