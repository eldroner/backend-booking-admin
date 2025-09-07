import { Schema, model, Document } from 'mongoose';

export interface IAllowedBusiness extends Document {
  idNegocio: string;
  emailContacto: string;
  password?: string; // Campo de contraseña opcional
  estado: 'pendiente' | 'activo';
  fechaCreacion: Date;
  stripeSubscriptionId?: string;
  subscriptionStatus?: 'trialing' | 'active' | 'canceled' | 'paused' | 'unpaid';
  periodEndDate?: Date;
  cancelAtPeriodEnd?: boolean;
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
  },
  stripeSubscriptionId: {
    type: String,
    required: false,
  },
  subscriptionStatus: {
    type: String,
    enum: ['trialing', 'active', 'canceled', 'paused', 'unpaid'],
    required: false,
  },
  periodEndDate: {
    type: Date,
    required: false,
  },
  cancelAtPeriodEnd: {
    type: Boolean,
    default: false,
  },
});

export const AllowedBusinessModel = model<IAllowedBusiness>('AllowedBusiness', AllowedBusinessSchema);
