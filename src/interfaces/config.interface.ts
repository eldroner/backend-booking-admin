export interface IBusinessConfig {
  idNegocio?: string;
  nombre: string;
  duracionBase: number; // en minutos
  maxReservasPorSlot: number;
  servicios: Array<{
    id: string;
    nombre: string;
    duracion: number; // en minutos
    precio?: number; // opcional
    descripcion?: string; // opcional
  }>;
  horariosNormales: Array<{
    dia: number; // 0 (Domingo) a 6 (Sábado)
    tramos: Array<{
      horaInicio: string; // formato "HH:MM"
      horaFin: string;    // formato "HH:MM"
    }>;
  }>;
  horariosEspeciales: Array<{
    fecha: string; // formato "YYYY-MM-DD"
    horaInicio: string;
    horaFin: string;
    activo: boolean;
    motivo?: string; // opcional
  }>;
  // Campos adicionales para futuras expansiones
  metadata?: Record<string, any>;
}