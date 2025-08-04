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
Object.defineProperty(exports, "__esModule", { value: true });
exports.BusinessConfigModel = void 0;
const mongoose_1 = __importStar(require("mongoose"));
// Validaciones adicionales
const timeValidator = (time) => /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time);
const dateValidator = (date) => /^\d{4}-\d{2}-\d{2}$/.test(date);
const BusinessConfigSchema = new mongoose_1.Schema({
    idNegocio: { type: String, required: false, unique: true, sparse: true },
    nombre: { type: String, required: [true, 'El nombre es requerido'] },
    slogan: { type: String, maxlength: [150, 'El eslogan no puede exceder los 150 caracteres'] },
    duracionBase: {
        type: Number,
        required: true,
        min: [5, 'La duración mínima es 5 minutos']
    },
    maxReservasPorSlot: {
        type: Number,
        required: true,
        min: [1, 'Debe permitir al menos 1 reserva por slot']
    },
    servicios: [{
            id: { type: String, required: true },
            nombre: { type: String, required: true },
            duracion: { type: Number, required: true, min: 5 }
        }],
    horariosNormales: [{
            dia: {
                type: Number,
                required: true,
                min: 0,
                max: 6
            },
            tramos: [{
                    horaInicio: {
                        type: String,
                        required: true,
                        validate: {
                            validator: timeValidator,
                            message: 'Formato de hora inválido (HH:MM)'
                        }
                    },
                    horaFin: {
                        type: String,
                        required: true,
                        validate: {
                            validator: timeValidator,
                            message: 'Formato de hora inválido (HH:MM)'
                        }
                    }
                }]
        }],
    horariosEspeciales: [{
            fecha: {
                type: String,
                required: true,
                validate: {
                    validator: dateValidator,
                    message: 'Formato de fecha inválido (YYYY-MM-DD)'
                }
            },
            horaInicio: {
                type: String,
                required: true,
                validate: timeValidator
            },
            horaFin: {
                type: String,
                required: true,
                validate: timeValidator
            },
            activo: { type: Boolean, default: true }
        }],
    direccion: { type: String },
    descripcion: { type: String },
    fotoUrls: [{ type: String }]
}, { timestamps: true });
// Índice único para asegurar solo un documento de configuración por negocio
exports.BusinessConfigModel = mongoose_1.default.model('BusinessConfig', BusinessConfigSchema);
