// backend-booking-manager/src/interfaces/config.interface.ts
export interface IBusinessConfig {
  nombre: string;
  tipoNegocio: 'peluqueria' | 'hotel' | 'consulta_medica' | 'general';
  duracionBase: number;
  maxReservasPorSlot: number;
  servicios: Array<{
    id: string;
    nombre: string;
    duracion: number;
  }>;
  horariosNormales: Array<{
    dia: number;
    tramos: Array<{
      horaInicio: string;  // ✅
      horaFin: string;     // ✅
    }>;
  }>;
  horariosEspeciales: Array<{
    fecha: string;
    horaInicio: string;
    horaFin: string;
    activo: boolean;
  }>;
}