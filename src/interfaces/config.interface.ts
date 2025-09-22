import { Document } from 'mongoose';

export interface IServicio {
  id: string;
  nombre: string;
  duracion: number; // Duración en minutos
}

export interface ITramoHorario {
  horaInicio: string; // HH:MM
  horaFin: string;    // HH:MM
}

export interface IHorarioNormal {
  dia: number; // 0 (domingo) a 6 (sábado)
  tramos: ITramoHorario[];
}

export interface IHorarioEspecial {
  fecha: string; // YYYY-MM-DD
  horaInicio: string; // HH:MM
  horaFin: string;    // HH:MM
  activo: boolean; // Para activar/desactivar un horario especial
}

export interface IBusinessConfig extends Document {
  idNegocio?: string; // Opcional para la configuración por defecto
  nombre: string;
  slogan?: string;
  telefono?: string;
  duracionBase: number; // Duración base de los slots en minutos
  maxReservasPorSlot: number; // Máximo de reservas permitidas por slot
  servicios: IServicio[];
  horariosNormales: IHorarioNormal[];
  horariosEspeciales: IHorarioEspecial[];
  direccion?: string;
  descripcion?: string;
  fotoUrls?: string[];
}