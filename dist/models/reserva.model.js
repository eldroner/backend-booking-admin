"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReservaModel = void 0;
const mongoose_1 = require("mongoose");
const reservaSchema = new mongoose_1.Schema({
    _id: { type: String, required: true },
    idNegocio: { type: String, required: false },
    usuario: {
        nombre: {
            type: String,
            required: true,
            trim: true,
            minlength: [2, 'El nombre debe tener al menos 2 caracteres']
        },
        email: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
            validate: {
                validator: (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
                message: 'Por favor ingrese un email válido'
            }
        },
        telefono: {
            type: String,
            trim: true,
            validate: {
                validator: (tel) => !tel || /^[0-9+\-\s]+$/.test(tel),
                message: 'El teléfono solo puede contener números, +, - o espacios'
            }
        }
    },
    expiresAt: {
        type: Date
    },
    duracion: {
        type: Number,
        default: 30, // Valor por defecto
        min: [5, 'La duración mínima es 5 minutos']
    },
    fechaInicio: {
        type: Date,
        required: true,
        validate: {
            validator: (date) => !isNaN(date.getTime()),
            message: 'Fecha de inicio inválida'
        }
    },
    fechaFin: {
        type: Date,
        validate: {
            validator: function (date) {
                if (!date)
                    return true;
                return !isNaN(date.getTime()) && date > this.fechaInicio;
            },
            message: 'Fecha de fin debe ser posterior a la fecha de inicio'
        }
    },
    servicio: {
        type: String,
        required: true,
        trim: true
    },
    estado: {
        type: String,
        enum: ['pendiente', 'pendiente_email', 'confirmada', 'cancelada'],
        default: 'pendiente_email' // Cambiado a 'pendiente' como estado inicial
    },
    confirmacionToken: {
        type: String,
        required: true,
        index: true,
        sparse: true // Permite null/undefined pero mantiene unicidad para valores existentes
    },
    notas: {
        type: String,
        trim: true,
        maxlength: [500, 'Las notas no pueden exceder los 500 caracteres']
    }
}, {
    timestamps: true,
    toJSON: {
        transform: (doc, ret) => {
            ret.id = ret._id;
            delete ret._id;
            delete ret.__v;
            return ret;
        }
    }
});
// Índice compuesto para asegurar que una reserva es única para un servicio y fecha por negocio
// Se usa sparse: true para que el índice único solo se aplique a documentos que tengan el campo idNegocio.
reservaSchema.index({ idNegocio: 1, fechaInicio: 1, servicio: 1 }, { unique: true, sparse: true });
exports.ReservaModel = (0, mongoose_1.model)('Reserva', reservaSchema);
