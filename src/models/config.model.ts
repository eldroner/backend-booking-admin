import mongoose, { Schema } from 'mongoose';
import { IBusinessConfig } from '../interfaces/config.interface';

// Validaciones adicionales
const timeValidator = (time: string) => /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time);
const dateValidator = (date: string) => /^\d{4}-\d{2}-\d{2}$/.test(date);

const BusinessConfigSchema = new Schema<IBusinessConfig>({ 
  nombre: { type: String, required: [true, 'El nombre es requerido'] },
  tipoNegocio: { 
    type: String, 
    enum: ['peluqueria', 'hotel', 'consulta_medica', 'general'],
    required: [true, 'El tipo de negocio es requerido']
  },
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
  }]
}, { timestamps: true });

// Índice único para asegurar solo un documento de configuración
BusinessConfigSchema.index({}, { unique: true });

export const BusinessConfigModel = mongoose.model<IBusinessConfig>(
  'BusinessConfig', 
  BusinessConfigSchema
);