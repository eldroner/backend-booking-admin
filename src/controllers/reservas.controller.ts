import { Request, Response } from 'express';
import { ReservaModel, IReserva } from '../models/reserva.model';
import { v4 as uuidv4 } from 'uuid';

// Interfaz para el cuerpo de la solicitud
interface ReservaRequestBody {
  usuario: {
    nombre: string;
    email: string;
    telefono?: string;
  };
  fechaInicio: string;
  fechaFin?: string;
  servicio: string;
  estado?: string;
}

// Interfaz para la respuesta
interface ReservaResponse {
  id: string;
  usuario: {
    nombre: string;
    email: string;
    telefono?: string;
  };
  fechaInicio: string;
  fechaFin?: string;
  servicio: string;
  estado: string;
}

export const createReserva = async (
  req: Request<{}, {}, ReservaRequestBody>, 
  res: Response<ReservaResponse | { error: string; detalles?: string }>
) => {
  try {
    // Validación de campos requeridos
    const requiredFields: (keyof ReservaRequestBody)[] = ['usuario', 'fechaInicio', 'servicio'];
    const missingFields = requiredFields.filter(field => !req.body[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        error: "Datos incompletos",
        detalles: `Faltan los siguientes campos: ${missingFields.join(', ')}`
      });
    }

    // Validación de usuario
    if (!req.body.usuario.nombre?.trim() || !req.body.usuario.email?.trim()) {
      return res.status(400).json({
        error: "Datos de usuario incompletos",
        detalles: "Nombre y email son requeridos"
      });
    }

    // Validación de fechas
    const fechaInicio = new Date(req.body.fechaInicio);
    if (isNaN(fechaInicio.getTime())) {
      return res.status(400).json({
        error: "Fecha inválida",
        detalles: "La fecha de inicio no es válida"
      });
    }

    // Crear objeto de reserva
    const reservaData: {
      _id: string;
      usuario: {
        nombre: string;
        email: string;
        telefono?: string;
      };
      fechaInicio: Date;
      fechaFin?: Date; // Añade esto como opcional
      servicio: string;
      estado: string;
    } = {
      _id: uuidv4(),
      usuario: {
        nombre: req.body.usuario.nombre.trim(),
        email: req.body.usuario.email.trim().toLowerCase(),
        telefono: req.body.usuario.telefono?.trim()
      },
      fechaInicio: fechaInicio,
      servicio: req.body.servicio,
      estado: req.body.estado || 'confirmada'
    };

    // Añadir fechaFin si existe
    if (req.body.fechaFin) {
      const fechaFin = new Date(req.body.fechaFin);
      if (isNaN(fechaFin.getTime())) {
        return res.status(400).json({
          error: "Fecha inválida",
          detalles: "La fecha de fin no es válida"
        });
      }
      if (fechaFin <= fechaInicio) {
        return res.status(400).json({
          error: "Fechas inconsistentes",
          detalles: "La fecha de fin debe ser posterior a la fecha de inicio"
        });
      }
      reservaData.fechaFin = fechaFin;
    }

    // Crear y guardar la reserva
    const nuevaReserva = new ReservaModel(reservaData);
    const reservaGuardada = await nuevaReserva.save();

    // Preparar respuesta
    const response: ReservaResponse = {
      id: reservaGuardada._id,
      usuario: reservaGuardada.usuario,
      fechaInicio: reservaGuardada.fechaInicio.toISOString(),
      servicio: reservaGuardada.servicio,
      estado: reservaGuardada.estado
    };

    if (reservaGuardada.fechaFin) {
      response.fechaFin = reservaGuardada.fechaFin.toISOString();
    }

    return res.status(201).json(response);

  } catch (error) {
    console.error('Error en createReserva:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return res.status(500).json({
      error: "Error al crear reserva",
      detalles: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    });
  }
};

// Añade esto al final de reservas.controller.ts

export const getReservas = async (
  req: Request,
  res: Response<ReservaResponse[] | { error: string }>
) => {
  try {
    const reservas = await ReservaModel.find().lean();
    const response: ReservaResponse[] = reservas.map(reserva => ({
      id: reserva._id.toString(),
      usuario: reserva.usuario,
      fechaInicio: reserva.fechaInicio.toISOString(),
      servicio: reserva.servicio,
      estado: reserva.estado,
      ...(reserva.fechaFin && { fechaFin: reserva.fechaFin.toISOString() })
    }));
    
    return res.json(response);
  } catch (error) {
    console.error('Error al obtener reservas:', error);
    return res.status(500).json({ 
      error: "Error al obtener reservas" 
    });
  }
};

export const deleteReserva = async (
  req: Request<{ id: string }>,
  res: Response<{ success: true } | { error: string }>
) => {
  try {
    const { id } = req.params;
    const result = await ReservaModel.deleteOne({ _id: id });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ 
        error: "Reserva no encontrada" 
      });
    }
    
    return res.json({ success: true });
  } catch (error) {
    console.error('Error al eliminar reserva:', error);
    return res.status(500).json({ 
      error: "Error al eliminar reserva" 
    });
  }
};