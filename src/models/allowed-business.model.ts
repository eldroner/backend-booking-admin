
import { Schema, model, Document } from 'mongoose';

export interface IAllowedBusiness extends Document {
  idNegocio: string;
  emailContacto: string;
  password?: string; // Campo de contraseña opcional
  estado: 'pendiente' | 'activo';
  fechaCreacion: Date;
}

const AllowedBusinessSchema = new Schema<IAllowedBusiness>({
  idNegocio: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true,
    lowercase: true 
  },
  emailContacto: { 
    type: String, 
    required: true,
    trim: true,
    lowercase: true 
  },
  password: { // Definición del campo de contraseña en el esquema
    type: String,
    required: false // Opcional por ahora
  },
  estado: { 
    type: String, 
    enum: ['pendiente', 'activo'], 
    default: 'pendiente' 
  },
  fechaCreacion: { 
    type: Date, 
    default: Date.now 
  }
});

export const AllowedBusinessModel = model<IAllowedBusiness>('AllowedBusiness', AllowedBusinessSchema);
