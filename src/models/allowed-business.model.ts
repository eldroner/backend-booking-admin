
import { Schema, model, Document } from 'mongoose';

export interface IAllowedBusiness extends Document {
  idNegocio: string;
  emailContacto: string;
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
