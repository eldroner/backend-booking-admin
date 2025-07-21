
import { Schema, model, Document } from 'mongoose';

export interface IServicio extends Document {
  idNegocio?: string;
  nombre: string;
  duracion: number;
}

const servicioSchema = new Schema<IServicio>({
  idNegocio: { type: String, required: false },
  nombre: { type: String, required: true },
  duracion: { type: Number, required: true }
});

// Índice compuesto para asegurar que el nombre del servicio es único por negocio
servicioSchema.index({ idNegocio: 1, nombre: 1 }, { unique: true });

export default model<IServicio>('Servicio', servicioSchema);
