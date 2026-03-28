import mongoose, { Schema } from 'mongoose';
import { IBusinessConfig } from '../interfaces/config.interface';

// Validaciones adicionales
const timeValidator = (time: string) => /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time);
const dateValidator = (date: string) => /^\d{4}-\d{2}-\d{2}$/.test(date);

const BusinessConfigSchema = new Schema<IBusinessConfig>({ 
  idNegocio: { type: String, required: false, unique: true, sparse: true },
  nombre: { type: String, required: [true, 'El nombre es requerido'] },
  slogan: { type: String, maxlength: [150, 'El eslogan no puede exceder los 150 caracteres'] },
  telefono: { type: String },
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
  antelacionMinimaHoras: {
    type: Number,
    default: 0,
    min: [0, 'La antelación mínima no puede ser negativa']
  },
  provincia: {
    type: String,
    uppercase: true,
    trim: true
  },
  servicios: [{
    id: { type: String, required: true },
    nombre: { type: String, required: true },
    duracion: { type: Number, required: true, min: 5 },
    precio: { type: Number },
    categoria: { type: String },
    esPrecioDesde: { type: Boolean, default: false },
    enOferta: { type: Boolean, default: false },
    precioOferta: { type: Number },
    fechaFinOferta: { type: String },
    notaPrecio: { type: String, maxlength: 200 }
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
  fotoUrls: [{ type: String }],
  googlePlaceId: { type: String },
  googleCustomLogo: { type: String },
  // --- Datos Fiscales ---
  cif: { type: String, trim: true },
  razonSocial: { type: String, trim: true },
  direccionFiscal: { type: String, trim: true },
  codigoPostal: { type: String, trim: true },
  ciudad: { type: String, trim: true },
  porcentajeIva: { type: Number, default: 0, min: 0, max: 100 }
}, { timestamps: true });

// Índice único para asegurar solo un documento de configuración por negocio

export const BusinessConfigModel = mongoose.model<IBusinessConfig>(
  'BusinessConfig', 
  BusinessConfigSchema
);