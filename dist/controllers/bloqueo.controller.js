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
        const bloqueos = await bloqueo_model_1.default.find();
        res.json(bloqueos.map(b => b.fecha.toISOString().split('T')[0]));
    }
    catch (error) {
        res.status(500).send(error);
    }
};
exports.getFechasBloqueadas = getFechasBloqueadas;
// Crear una nueva fecha bloqueada
const addFechaBloqueada = async (req, res) => {
    try {
        const { fecha } = req.body;
        const newBloqueo = new bloqueo_model_1.default({ fecha });
        await newBloqueo.save();
        res.status(201).json(newBloqueo);
    }
    catch (error) {
        res.status(500).send(error);
    }
};
exports.addFechaBloqueada = addFechaBloqueada;
// Eliminar una fecha bloqueada
const deleteFechaBloqueada = async (req, res) => {
    try {
        const { fecha } = req.params;
        const result = await bloqueo_model_1.default.findOneAndDelete({ fecha: new Date(fecha) });
        if (!result) {
            return res.status(404).send('Fecha no encontrada');
        }
        res.status(200).send('Fecha desbloqueada');
    }
    catch (error) {
        res.status(500).send(error);
    }
};
exports.deleteFechaBloqueada = deleteFechaBloqueada;
