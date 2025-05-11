import mongoose, { Schema } from 'mongoose';
import { IBusinessConfig } from '../interfaces/config.interface'; // Importar la interfaz

// Definir el esquema
const BusinessConfigSchema = new Schema<IBusinessConfig>({ 
  
    nombre: { type: String, required: true },
    tipoNegocio: { 
      type: String, 
      enum: ['peluqueria', 'hotel', 'consulta_medica', 'general'], 
      required: true 
    },
    duracionBase: { type: Number, required: true },
    maxReservasPorSlot: { type: Number, required: true },
    servicios: [
      {
        id: { type: String, required: true },
        nombre: { type: String, required: true },
        duracion: { type: Number, required: true }
      }
    ],
    horariosNormales: [
      {
        dia: { type: Number, required: true },
        tramos: [
          {
            horaInicio: { type: String, required: true },
            horaFin: { type: String, required: true }
          }
        ]
      }
    ],
    horariosEspeciales: [
      {
        fecha: { type: String, required: true },
        horaInicio: { type: String, required: true },
        horaFin: { type: String, required: true },
        activo: { type: Boolean, required: true }
      }
    ]
  },
  { timestamps: true }
);

// Exportar con nombre diferente
export const BusinessConfigModel = mongoose.model<IBusinessConfig>(
    'BusinessConfig', 
    BusinessConfigSchema
  );