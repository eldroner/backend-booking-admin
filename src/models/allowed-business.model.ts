import { Schema, model, Document } from 'mongoose';

export interface IAllowedBusiness extends Document {
  idNegocio: string;
  emailContacto: string;
  password?: string; // Campo de contraseña opcional
  estado: 'pendiente' | 'activo';
  fechaCreacion: Date;
  stripeSubscriptionId?: string;
  subscriptionStatus?: 'trialing' | 'active' | 'canceled' | 'paused' | 'unpaid' | 'past_due' | 'incomplete' | 'incomplete_expired';
  periodEndDate?: Date;
  cancelAtPeriodEnd?: boolean;
  /** Fin del periodo de gracia tras fallo de pago (tras este momento se puede purgar la cuenta). */
  billingGraceEndsAt?: Date;
  /** Evita reenviar el mismo email en cada reintento de cobro de Stripe. */
  billingFailureEmailSentAt?: Date;
  /** Si es futura, no se permiten reservas nuevas (vista admin sigue accesible). */
  pausedUntil?: Date;
  /** Origen del alta: panel super-admin vs registro web con Stripe. */
  billingOnboardingSource?: 'super_admin' | 'stripe_self_serve';
  /** Última vez que se envió la invitación para vincular Stripe (alta manual). */
  stripeBillingInviteSentAt?: Date;
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
    enum: ['trialing', 'active', 'canceled', 'paused', 'unpaid', 'past_due', 'incomplete', 'incomplete_expired'],
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
  billingGraceEndsAt: {
    type: Date,
    required: false,
  },
  billingFailureEmailSentAt: {
    type: Date,
    required: false,
  },
  pausedUntil: {
    type: Date,
    required: false,
  },
  billingOnboardingSource: {
    type: String,
    enum: ['super_admin', 'stripe_self_serve'],
    required: false,
  },
  stripeBillingInviteSentAt: {
    type: Date,
    required: false,
  },
});

export const AllowedBusinessModel = model<IAllowedBusiness>('AllowedBusiness', AllowedBusinessSchema);
