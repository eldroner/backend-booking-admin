import { Schema, model, Document } from 'mongoose';

export interface IStaff extends Document {
  idNegocio: string;
  nombre: string;
  rol: string;
  fotoUrl?: string;
  serviciosIds: string[]; // IDs de los servicios que puede realizar
  rating: number;
  numRatings: number;
  activo: boolean;
}

const staffSchema = new Schema<IStaff>({
  idNegocio: { type: String, required: true, index: true, trim: true },
  nombre: { type: String, required: true, trim: true },
  rol: { type: String, required: true, trim: true },
  fotoUrl: { type: String },
  serviciosIds: [{ type: String }],
  rating: { type: Number, default: 0 },
  numRatings: { type: Number, default: 0 },
  activo: { type: Boolean, default: true }
}, {
  timestamps: true
});

staffSchema.index({ idNegocio: 1, activo: 1 });

export const StaffModel = model<IStaff>('Staff', staffSchema);
