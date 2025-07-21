"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteServicio = exports.addServicio = exports.getServicios = void 0;
const servicios_model_1 = __importDefault(require("../models/servicios.model"));
// Obtener todos los servicios
const getServicios = async (req, res) => {
    try {
        const { idNegocio } = req.query;
        const query = idNegocio ? { idNegocio: idNegocio } : { idNegocio: { $exists: false } };
        const servicios = await servicios_model_1.default.find(query);
        res.json(servicios);
    }
    catch (error) {
        res.status(500).send(error);
    }
};
exports.getServicios = getServicios;
// Crear un nuevo servicio
const addServicio = async (req, res) => {
    try {
        const { nombre, duracion, idNegocio } = req.body;
        const newServicio = new servicios_model_1.default({ nombre, duracion, ...(idNegocio && { idNegocio }) });
        await newServicio.save();
        res.status(201).json(newServicio);
    }
    catch (error) {
        res.status(500).send(error);
    }
};
exports.addServicio = addServicio;
// Eliminar un servicio
const deleteServicio = async (req, res) => {
    try {
        const { id } = req.params;
        const { idNegocio } = req.query; // Asumiendo que el id del negocio viene como query param
        const query = { _id: id };
        if (idNegocio) {
            query.idNegocio = idNegocio;
        }
        else {
            query.idNegocio = { $exists: false };
        }
        const result = await servicios_model_1.default.findOneAndDelete(query);
        if (!result) {
            return res.status(404).send('Servicio no encontrado');
        }
        res.status(200).send('Servicio eliminado');
    }
    catch (error) {
        res.status(500).send(error);
    }
};
exports.deleteServicio = deleteServicio;
