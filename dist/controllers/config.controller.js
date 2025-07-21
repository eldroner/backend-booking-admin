"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateConfig = exports.getConfig = void 0;
const config_model_1 = require("../models/config.model");
const zod_1 = require("zod");
const ConfigSchema = zod_1.z.object({
    nombre: zod_1.z.string().min(1),
    duracionBase: zod_1.z.number().min(5),
    maxReservasPorSlot: zod_1.z.number().min(1),
    servicios: zod_1.z.array(zod_1.z.object({
        id: zod_1.z.string().min(1),
        nombre: zod_1.z.string().min(1),
        duracion: zod_1.z.number().min(5)
    })),
    horariosNormales: zod_1.z.array(zod_1.z.object({
        dia: zod_1.z.number().min(0).max(6),
        tramos: zod_1.z.array(zod_1.z.object({
            horaInicio: zod_1.z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
            horaFin: zod_1.z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
        })).min(1)
    })).min(1),
    horariosEspeciales: zod_1.z.array(zod_1.z.object({
        fecha: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        horaInicio: zod_1.z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
        horaFin: zod_1.z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
        activo: zod_1.z.boolean()
    })).optional()
});
const getConfig = async (req, res) => {
    try {
        const { idNegocio } = req.query;
        let config;
        if (idNegocio) {
            // Intenta encontrar la configuración específica del negocio
            config = await config_model_1.BusinessConfigModel.findOne({ idNegocio: idNegocio });
        }
        if (!config) {
            // Si no se encontró la configuración específica, busca la configuración antigua (sin idNegocio)
            config = await config_model_1.BusinessConfigModel.findOne({ idNegocio: { $exists: false } });
        }
        if (!config) {
            // Si no existe ninguna configuración, crea una por defecto con idNegocio: 'default'
            const defaultConfig = await config_model_1.BusinessConfigModel.create({
                idNegocio: 'default',
                nombre: "Mi Negocio",
                duracionBase: 30,
                maxReservasPorSlot: 1,
                servicios: [],
                horariosNormales: Array.from({ length: 7 }, (_, dia) => ({
                    dia,
                    tramos: dia === 0 ? [{ horaInicio: "00:00", horaFin: "00:00" }] :
                        dia === 6 ? [{ horaInicio: "10:00", horaFin: "14:00" }] :
                            [{ horaInicio: "09:00", horaFin: "13:00" },
                                { horaInicio: "15:00", horaFin: "19:00" }]
                })),
                horariosEspeciales: []
            });
            return res.json(defaultConfig);
        }
        // Sanear la configuración existente para cumplir con la validación de Zod
        const sanitizedConfig = config.toObject(); // Convertir a objeto JS plano
        sanitizedConfig.horariosNormales = sanitizedConfig.horariosNormales.map(horarioDia => {
            if (horarioDia.tramos.length === 0) {
                return { ...horarioDia, tramos: [{ horaInicio: "00:00", horaFin: "00:00" }] };
            }
            return horarioDia;
        });
        res.json(sanitizedConfig);
    }
    catch (error) {
        console.error('Error getting config:', error);
        res.status(500).json({ error: 'Error al obtener configuración' });
    }
};
exports.getConfig = getConfig;
const updateConfig = async (req, res) => {
    try {
        const { idNegocio } = req.query;
        const query = idNegocio ? { idNegocio: idNegocio } : { idNegocio: { $exists: false } };
        // Validación con Zod
        const validatedData = ConfigSchema.parse(req.body);
        // Actualizar o crear la configuración
        const updatedConfig = await config_model_1.BusinessConfigModel.findOneAndUpdate(query, { ...validatedData, ...(idNegocio && { idNegocio }) }, { new: true, upsert: true, setDefaultsOnInsert: true });
        res.json(updatedConfig);
    }
    catch (error) {
        console.error('Error updating config:', error);
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({
                error: 'Datos inválidos',
                details: error.errors
            });
        }
        res.status(500).json({
            error: error instanceof Error ? error.message : 'Error actualizando configuración'
        });
    }
};
exports.updateConfig = updateConfig;
// Eliminar saveConfig ya que updateConfig hace lo mismo con PUT
