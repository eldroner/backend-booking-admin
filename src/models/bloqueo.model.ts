
import { Schema, model, Document } from 'mongoose';

export interface IBloqueo extends Document {
  fecha: Date;
}

const bloqueoSchema = new Schema<IBloqueo>({
  fecha: { type: Date, required: true, unique: true }
});

export default model<IBloqueo>('Bloqueo', bloqueoSchema);
