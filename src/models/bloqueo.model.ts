
import { Schema, model, Document } from 'mongoose';

export interface IBloqueo extends Document {
  idNegocio?: string;
  fecha: Date;
}

const bloqueoSchema = new Schema<IBloqueo>({
  idNegocio: { type: String, required: false },
  fecha: { type: Date, required: true }
});

// Índice compuesto para asegurar que la fecha es única por negocio
bloqueoSchema.index({ idNegocio: 1, fecha: 1 }, { unique: true });

export default model<IBloqueo>('Bloqueo', bloqueoSchema);
