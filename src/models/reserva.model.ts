// backend/src/models/reserva.model.ts
import { Schema, model } from 'mongoose';

const reservaSchema = new Schema({
  usuario: {
    nombre: { type: String, required: true },
    email: { type: String, required: true },
    telefono: String
  },
  fechaInicio: { type: Date, required: true },
  servicio: { type: String, required: true },
  estado: { type: String, default: 'confirmada' }
});

export const ReservaModel = model('Reserva', reservaSchema);