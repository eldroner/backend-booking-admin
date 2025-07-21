"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const servicioSchema = new mongoose_1.Schema({
    idNegocio: { type: String, required: false },
    nombre: { type: String, required: true },
    duracion: { type: Number, required: true }
});
// Índice compuesto para asegurar que el nombre del servicio es único por negocio
servicioSchema.index({ idNegocio: 1, nombre: 1 }, { unique: true });
exports.default = (0, mongoose_1.model)('Servicio', servicioSchema);
