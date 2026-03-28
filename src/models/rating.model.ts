import { Schema, model, Document } from 'mongoose';

export interface IRating extends Document {
  reservaId: string;
  staffId: string;
  puntuacion: number; // 1-5
  comentario?: string;
  nombreCliente: string;
  fecha: Date;
}

const ratingSchema = new Schema<IRating>({
  reservaId: { type: String, required: true, unique: true },
  staffId: { type: String, required: true, index: true },
  puntuacion: { type: Number, required: true, min: 1, max: 5 },
  comentario: { type: String, trim: true, maxlength: 500 },
  nombreCliente: { type: String, required: true },
  fecha: { type: Date, default: Date.now }
}, {
  timestamps: true
});

export const RatingModel = model<IRating>('Rating', ratingSchema);
