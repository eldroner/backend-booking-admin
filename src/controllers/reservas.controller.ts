import { Request, Response } from 'express';
import { ReservaModel } from '../models/reserva.model';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { BusinessConfigModel } from '../models/config.model';

// Interfaces para tipado fuerte
interface Usuario {
  nombre: string;
  email: string;
  telefono?: string;
}

interface ReservaRequestBody {
  usuario: Usuario;
  fechaInicio: string;
  fechaFin?: string;
  servicio: string;
  estado?: string;
  duracion?: number;
}

interface ReservaResponse {
  id: string;
  usuario: Usuario;
  fechaInicio: string;
  fechaFin?: string;
  servicio: string;
  estado: string;
  confirmacionToken: string;
  duracion: number; // Añadir esta propiedad
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

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET no está configurado en las variables de entorno");
    }

    const confirmacionToken = jwt.sign(
      {
        email: req.body.usuario.email,
        fecha: fechaInicio.toISOString(),
        servicio: req.body.servicio
      },
      process.env.JWT_SECRET, // Sin el ! ahora
      { expiresIn: '2d' }
    );

    // Crear objeto de reserva
    const reservaData: any = {
      _id: uuidv4(),
      usuario: {
        nombre: req.body.usuario.nombre.trim(),
        email: req.body.usuario.email.trim().toLowerCase(),
        telefono: req.body.usuario.telefono?.trim()
      },
      fechaInicio: fechaInicio,
      servicio: req.body.servicio,
      estado: 'pendiente',
      confirmacionToken,
      duracion: req.body.duracion || 30
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
      estado: reservaGuardada.estado,
      confirmacionToken: reservaGuardada.confirmacionToken as string,
      duracion: reservaGuardada.duracion || 30
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

export const getReservas = async (
  req: Request,
  res: Response<ReservaResponse[] | { error: string; detalles?: string }>
) => {
  try {
    const { fecha } = req.query;
    let query: any = { estado: { $in: ['pendiente', 'confirmada'] } };

    if (fecha) {
      if (isNaN(Date.parse(fecha as string))) {
        return res.status(400).json({
          error: "Formato de fecha inválido",
          detalles: "Use formato YYYY-MM-DD"
        });
      }

      const startDate = new Date(fecha as string);
      startDate.setHours(0, 0, 0, 0);

      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 1);

      query.fechaInicio = {
        $gte: startDate,
        $lt: endDate
      };
    }

    // Añade .select('+duracion') para asegurar que trae el campo aunque no esté en el schema
    const reservas = await ReservaModel.find(query)
      .sort({ fechaInicio: 1 })
      .select('+duracion')
      .lean();

    const response: ReservaResponse[] = reservas.map(reserva => ({
      id: reserva._id.toString(),
      usuario: {
        nombre: reserva.usuario.nombre,
        email: reserva.usuario.email,
        ...(reserva.usuario.telefono && { telefono: reserva.usuario.telefono })
      },
      fechaInicio: reserva.fechaInicio.toISOString(),
      ...(reserva.fechaFin && { fechaFin: reserva.fechaFin.toISOString() }),
      servicio: reserva.servicio,
      estado: reserva.estado,
      confirmacionToken: reserva.confirmacionToken || '',
      duracion: (reserva as any).duracion || 30 // Valor por defecto seguro
    }));

    return res.json(response);
  } catch (error: unknown) {
    console.error('Error en getReservas:', error);

    return res.status(500).json({
      error: "Error al obtener reservas",
      ...(process.env.NODE_ENV === 'development' && {
        detalles: error instanceof Error ? error.message : String(error)
      })
    });
  }
};

export const confirmarReserva = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET no configurado");
    }

    // Verificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;

    // Buscar reserva pendiente
    const reserva = await ReservaModel.findOne({
      'usuario.email': decoded.email,
      fechaInicio: new Date(decoded.fecha),  // <-- Asegúrate que coincide
      servicio: decoded.servicio,
      estado: 'pendiente'
    });

    if (!reserva) {
      return res.status(404).json({ error: "Reserva no encontrada o ya confirmada" });
    }

    // Actualizar estado
    reserva.estado = 'confirmada';
    await reserva.save();

    res.json({
      success: true,
      reserva: {
        id: reserva._id,
        usuario: reserva.usuario,
        fechaInicio: reserva.fechaInicio.toISOString(),
        servicio: reserva.servicio
      }
    });

  } catch (error) {
    console.error('Error confirmando reserva:', error);
    res.status(400).json({
      error: "Token inválido o expirado"
    });
  }
};

// Nuevo endpoint para verificar disponibilidad
export const checkDisponibilidad = async (req: Request, res: Response) => {
  try {
    const { fecha, hora, duracion } = req.query;

    // Validaciones
    if (!fecha || !hora || !duracion) {
      return res.status(400).json({
        error: "Faltan parámetros: fecha, hora o duracion"
      });
    }

    const config = await BusinessConfigModel.findOne();
    if (!config) {
      return res.status(500).json({ error: "Configuración no encontrada" });
    }

    const horaInicio = new Date(`${fecha}T${hora}:00`);
    const horaFin = new Date(horaInicio.getTime() + parseInt(duracion as string) * 60000);

    // Verificar solapamientos
    const reservasExistentes = await ReservaModel.find({
      $or: [
        {
          fechaInicio: { $lt: horaFin },
          fechaFin: { $gt: horaInicio }
        },
        {
          fechaInicio: { $gte: horaInicio, $lt: horaFin }
        }
      ],
      estado: { $in: ['pendiente', 'confirmada'] }
    });

    const disponible = reservasExistentes.length < config.maxReservasPorSlot;
    res.json({ disponible });

  } catch (error) {
    console.error('Error en checkDisponibilidad:', error);
    res.status(500).json({ error: "Error al verificar disponibilidad" });
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