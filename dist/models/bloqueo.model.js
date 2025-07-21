"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const bloqueoSchema = new mongoose_1.Schema({
    idNegocio: { type: String, required: false },
    fecha: { type: Date, required: true }
});
// Índice compuesto para asegurar que la fecha es única por negocio
bloqueoSchema.index({ idNegocio: 1, fecha: 1 }, { unique: true });
exports.default = (0, mongoose_1.model)('Bloqueo', bloqueoSchema);
