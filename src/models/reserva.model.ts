import { Schema, model, Types } from 'mongoose';

const reservaSchema = new Schema({
  usuario: {
    nombre: { type: String, required: true },
    email: { type: String, required: true },
    telefono: String
  },
  fechaInicio: { type: Date, required: true },
  servicio: { type: String, required: true },
  estado: { 
    type: String, 
    enum: ['pendiente', 'confirmada', 'cancelada'],
    default: 'confirmada'
  }
}, {
  // Habilitar _id automático como ObjectId
  id: true,
  toJSON: {
    virtuals: true,
    transform: (doc, ret) => {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

export const ReservaModel = model('Reserva', reservaSchema);