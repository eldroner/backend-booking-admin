"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteFechaBloqueada = exports.addFechaBloqueada = exports.getFechasBloqueadas = void 0;
const bloqueo_model_1 = __importDefault(require("../models/bloqueo.model"));
// Obtener todas las fechas bloqueadas
const getFechasBloqueadas = async (req, res) => {
    try {
        const { idNegocio } = req.query; // Obtener idNegocio de los query parameters
        let query = {};
        const idNegocioConditions = [];
        if (idNegocio) {
            idNegocioConditions.push({ idNegocio: idNegocio });
        }
        idNegocioConditions.push({ idNegocio: { $exists: false } }); // Incluir fechas globales
        query = { $or: idNegocioConditions };
        const bloqueos = await bloqueo_model_1.default.find(query);
        res.json(bloqueos.map(b => b.fecha.toISOString().split('T')[0]));
    }
    catch (error) {
        console.error('Error al obtener fechas bloqueadas:', error);
        res.status(500).send('Error interno del servidor');
    }
};
exports.getFechasBloqueadas = getFechasBloqueadas;
// Crear una nueva fecha bloqueada
const addFechaBloqueada = async (req, res) => {
    try {
        const { fecha, idNegocio } = req.body;
        // Convertir la fecha a un objeto Date que represente la medianoche UTC
        const fechaUTC = new Date(fecha);
        fechaUTC.setUTCHours(0, 0, 0, 0);
        const newBloqueo = new bloqueo_model_1.default({ fecha: fechaUTC, idNegocio });
        await newBloqueo.save();
        res.status(201).json(newBloqueo);
    }
    catch (error) {
        console.error('Error al añadir fecha bloqueada:', error);
        res.status(500).send('Error interno del servidor');
    }
};
exports.addFechaBloqueada = addFechaBloqueada;
// Eliminar una fecha bloqueada
const deleteFechaBloqueada = async (req, res) => {
    try {
        const { fecha } = req.params;
        const { idNegocio } = req.query;
        // Convertir la fecha de los parámetros a un objeto Date que represente la medianoche UTC
        const fechaUTC = new Date(fecha);
        fechaUTC.setUTCHours(0, 0, 0, 0);
        let query = { fecha: fechaUTC };
        const idNegocioConditions = [];
        if (idNegocio) {
            idNegocioConditions.push({ idNegocio: idNegocio });
        }
        idNegocioConditions.push({ idNegocio: { $exists: false } });
        query = {
            fecha: fechaUTC,
            $or: idNegocioConditions
        };
        const result = await bloqueo_model_1.default.findOneAndDelete(query);
        if (!result) {
            return res.status(404).send('Fecha no encontrada');
        }
        res.status(200).send('Fecha desbloqueada');
    }
    catch (error) {
        console.error('Error al eliminar fecha bloqueada:', error);
        res.status(500).send('Error interno del servidor');
    }
};
exports.deleteFechaBloqueada = deleteFechaBloqueada;
