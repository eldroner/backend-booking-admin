import { Schema, model } from 'mongoose';

const ConfigSchema = new Schema({
  nombre: { type: String, required: true },
  horariosNormales: [
    {
      dia: { type: Number, required: true },
      tramos: [
        {
          horaInicio: { type: String, required: true },
          horaFin: { type: String, required: true }
        }
      ]
    }
  ],
  servicios: [
    {
      nombre: { type: String, required: true },
      duracion: { type: Number, required: true }
    }
  ]
});

export const ConfigModel = model('Config', ConfigSchema);