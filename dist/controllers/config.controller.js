"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateConfig = exports.getConfig = void 0;
const config_model_1 = require("../models/config.model");
const allowed_business_model_1 = require("../models/allowed-business.model");
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
        if (!idNegocio) {
            return res.status(400).json({ error: 'El idNegocio es requerido' });
        }
        // 1. Verificar si el negocio está en la lista blanca
        const negocioPermitido = await allowed_business_model_1.AllowedBusinessModel.findOne({ idNegocio: idNegocio });
        if (!negocioPermitido) {
            return res.status(404).json({ error: 'Negocio no encontrado o no autorizado' });
        }
        // 2. Buscar la configuración específica del negocio
        let config = await config_model_1.BusinessConfigModel.findOne({ idNegocio: idNegocio });
        // 3. Si no hay configuración, devolver una por defecto (sin guardarla)
        if (!config) {
            const defaultConfig = {
                idNegocio: idNegocio,
                nombre: "Mi Negocio (Sin configurar)",
                duracionBase: 30,
                maxReservasPorSlot: 1,
                servicios: [],
                horariosNormales: Array.from({ length: 7 }, (_, dia) => ({
                    dia,
                    tramos: dia === 0 || dia === 6 ? [] :
                        [{ horaInicio: "09:00", horaFin: "13:00" },
                            { horaInicio: "15:00", horaFin: "19:00" }]
                })),
                horariosEspeciales: []
            };
            return res.json(defaultConfig);
        }
        // 4. Devolver la configuración existente
        res.json(config);
    }
    catch (error) {
        console.error('Error getting config:', error);
        res.status(500).json({ error: 'Error al obtener la configuración' });
    }
};
exports.getConfig = getConfig;
const updateConfig = async (req, res) => {
    try {
        const { idNegocio } = req.query;
        if (!idNegocio) {
            return res.status(400).json({ error: 'El idNegocio es requerido' });
        }
        // 1. Verificar si el negocio está en la lista blanca
        const negocioPermitido = await allowed_business_model_1.AllowedBusinessModel.findOne({ idNegocio: idNegocio });
        if (!negocioPermitido) {
            return res.status(403).json({ error: 'No tiene permisos para configurar este negocio' });
        }
        // 2. Validar los datos de entrada
        const validatedData = ConfigSchema.parse(req.body);
        // 3. Actualizar o crear la configuración (upsert)
        const updatedConfig = await config_model_1.BusinessConfigModel.findOneAndUpdate({ idNegocio: idNegocio }, { ...validatedData, idNegocio: idNegocio }, { new: true, upsert: true, setDefaultsOnInsert: true });
        // 4. (Opcional) Marcar el negocio como 'activo' si estaba 'pendiente'
        if (negocioPermitido.estado === 'pendiente') {
            negocioPermitido.estado = 'activo';
            await negocioPermitido.save();
        }
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
            error: error instanceof Error ? error.message : 'Error actualizando la configuración'
        });
    }
};
exports.updateConfig = updateConfig;
// Eliminar saveConfig ya que updateConfig hace lo mismo con PUT
