import { Request, Response } from 'express';
import { ReservaModel } from '../models/reserva.model';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { BusinessConfigModel } from '../models/config.model';
import { AllowedBusinessModel } from '../models/allowed-business.model';
import crypto from 'crypto';
import { holidayService } from '../services/holiday.service';

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
  duracion: number;
  precioFinal?: number;
  notas?: string;
}

interface TokenResponse {
  token: string;
  emailContacto?: string;
  cancellationToken?: string;
}

export const createReserva = async (
  req: Request<{}, {}, ReservaRequestBody & { idNegocio?: string }>,
  res: Response<TokenResponse | { error: string; detalles?: string }>
) => {
  try {
    const { idNegocio, ...reservaBody } = req.body;

    // Validación de campos requeridos
    const requiredFields: (keyof ReservaRequestBody)[] = ['usuario', 'fechaInicio', 'servicio'];
    const missingFields = requiredFields.filter(field => !reservaBody[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        error: "Datos incompletos",
        detalles: `Faltan los siguientes campos: ${missingFields.join(', ')}`
      });
    }

    // Validación de usuario
    if (!reservaBody.usuario.nombre?.trim() || !reservaBody.usuario.email?.trim()) {
      return res.status(400).json({
        error: "Datos de usuario incompletos",
        detalles: "Nombre y email son requeridos"
      });
    }

    // Validación de fechas
    const fechaInicio = new Date(reservaBody.fechaInicio);
    if (isNaN(fechaInicio.getTime())) {
      return res.status(400).json({
        error: "Fecha inválida",
        detalles: "La fecha de inicio no es válida"
      });
    }

    // Validación de antelación mínima
    const config = await BusinessConfigModel.findOne({ idNegocio });
    if (config && config.antelacionMinimaHoras && config.antelacionMinimaHoras > 0) {
      const minDate = new Date();
      minDate.setHours(minDate.getHours() + config.antelacionMinimaHoras);
      if (fechaInicio < minDate) {
        return res.status(400).json({
          error: "Antelación insuficiente",
          detalles: `Debe reservar con al menos ${config.antelacionMinimaHoras} horas de antelación.`
        });
      }
    }

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET no está configurado en las variables de entorno");
    }

    const confirmacionToken = jwt.sign(
      {
        email: reservaBody.usuario.email,
        fecha: fechaInicio.toISOString(),
        servicio: reservaBody.servicio
      },
      process.env.JWT_SECRET,
      { expiresIn: '4h' }
    );

    if (!confirmacionToken) {
      throw new Error("Error al generar el token de confirmación");
    }

    const cancellationToken = crypto.randomBytes(32).toString('hex');

    // Obtener el email de contacto del negocio
    const negocioPermitido = await AllowedBusinessModel.findOne({ idNegocio: idNegocio as string });
    if (!negocioPermitido) {
      return res.status(404).json({ error: 'Negocio no encontrado o no autorizado' });
    }

    // Obtener precio base del servicio
    let precioBase = 0;
    if (config) {
      // Buscar el servicio por ID o por Nombre (comparando como strings para evitar fallos de ObjectId)
      const servicio = config.servicios.find(s => 
        String(s.id) === String(reservaBody.servicio) || 
        s.nombre === reservaBody.servicio
      );
      
      if (servicio) {
        precioBase = servicio.enOferta && servicio.precioOferta ? servicio.precioOferta : (servicio.precio || 0);
      }
    }

    // Crear objeto de reserva
    const reservaData: any = {
      _id: uuidv4(),
      idNegocio: idNegocio,
      usuario: {
        nombre: reservaBody.usuario.nombre.trim(),
        email: reservaBody.usuario.email.trim().toLowerCase(),
        telefono: reservaBody.usuario.telefono?.trim()
      },
      fechaInicio: fechaInicio,
      servicio: reservaBody.servicio,
      precioFinal: precioBase, // Guardar el precio encontrado
      estado: 'pendiente_email',
      confirmacionToken,
      cancellation_token: cancellationToken,
      duracion: reservaBody.duracion || 30,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutos
    };

    // Añadir fechaFin si existe
    if (reservaBody.fechaFin) {
      const fechaFin = new Date(reservaBody.fechaFin);
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

    return res.status(201).json({
      token: reservaGuardada.confirmacionToken,
      emailContacto: negocioPermitido.emailContacto,
      cancellationToken: (reservaGuardada as any).cancellation_token
    });

  } catch (error) {
    console.error('Error en createReserva:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return res.status(500).json({
      error: "Error al crear reserva",
      detalles: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    });
  }
};

export const addReservaAdmin = async (req: Request, res: Response) => {
    try {
        const { idNegocio, ...reservaData } = req.body;
        
        // Obtener precio base del servicio
        let precioBase = 0;
        const config = await BusinessConfigModel.findOne({ idNegocio });
        if (config) {
          const servicio = config.servicios.find(s => s.id === reservaData.servicio);
          if (servicio) {
            precioBase = servicio.enOferta && servicio.precioOferta ? servicio.precioOferta : (servicio.precio || 0);
          }
        }

        const uniqueToken = `admin-generated-${crypto.randomBytes(8).toString('hex')}`;
        const reserva = new ReservaModel({
            _id: uuidv4(),
            ...reservaData,
            precioFinal: reservaData.precioFinal !== undefined ? reservaData.precioFinal : precioBase,
            ...(idNegocio && { idNegocio }),
            confirmacionToken: uniqueToken,
            estado: 'confirmada'
        });
        await reserva.save();
        res.status(201).json(reserva);
    } catch (error) {
        console.error('Error en addReservaAdmin:', error);
        res.status(500).json({ message: 'Error al crear la reserva de administrador' });
    }
};

export const confirmarReservaDefinitiva = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    const reserva = await ReservaModel.findOneAndUpdate(
      {
        confirmacionToken: token,
        estado: 'pendiente_email',
        expiresAt: { $gt: new Date() }
      },
      { $set: { estado: 'confirmada' }, $unset: { expiresAt: 1 } },
      { new: true }
    );

    if (!reserva) {
      return res.status(404).json({ error: "Reserva no encontrada o ya confirmada" });
    }

    res.json({ success: true, reserva });
  } catch (error) {
    console.error('Error en confirmarReservaDefinitiva:', error);
    res.status(500).json({ error: "Error al confirmar reserva" });
  }
};

export const confirmarReservaAdmin = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const reserva = await ReservaModel.findByIdAndUpdate(
      id,
      { $set: { estado: 'confirmada' }, $unset: { expiresAt: 1 } },
      { new: true }
    );

    if (!reserva) {
      return res.status(404).json({ message: 'Reserva no encontrada' });
    }

    res.json(reserva);
  } catch (error) {
    console.error('Error al confirmar reserva por admin:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};
  

export const getReservas = async (
  req: Request,
  res: Response<ReservaResponse[] | { error: string; detalles?: string }>
) => {
  try {
    const { fecha, estado, idNegocio, startDate, endDate } = req.query;
    let query: any = {};

    if (idNegocio) {
      query.idNegocio = idNegocio as string;
    } else {
      query.idNegocio = { $exists: false };
    }

    if (estado && typeof estado === 'string') {
      query.estado = estado;
    } else {
      query.estado = { $in: ['pendiente', 'pendiente_email', 'confirmada', 'cancelada'] };
    }

    // Filtro por fecha única (retrocompatibilidad)
    if (fecha && !startDate && !endDate) {
      if (isNaN(Date.parse(fecha as string))) {
        return res.status(400).json({
          error: "Formato de fecha inválido",
          detalles: "Use formato YYYY-MM-DD"
        });
      }

      const sDate = new Date(fecha as string);
      sDate.setHours(0, 0, 0, 0);

      const eDate = new Date(sDate);
      eDate.setDate(sDate.getDate() + 1);

      query.fechaInicio = {
        $gte: sDate,
        $lt: eDate
      };
    } 
    // Filtro por rango de fechas (nuevo)
    else if (startDate || endDate) {
      query.fechaInicio = {};
      if (startDate) {
        const sDate = new Date(startDate as string);
        sDate.setHours(0, 0, 0, 0);
        query.fechaInicio.$gte = sDate;
      }
      if (endDate) {
        const eDate = new Date(endDate as string);
        eDate.setHours(23, 59, 59, 999);
        query.fechaInicio.$lte = eDate;
      }
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
      ...(reserva.expiresAt && { expiresAt: reserva.expiresAt.toISOString() }), // Add this line
      servicio: reserva.servicio,
      estado: reserva.estado,
      confirmacionToken: reserva.confirmacionToken || '',
      duracion: (reserva as any).duracion || 30, // Valor por defecto seguro
      precioFinal: reserva.precioFinal,
      notas: reserva.notas
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
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as {
      email: string;
      fecha: string;
      servicio: string;
    };

    // Buscar y actualizar reserva
    const reserva = await ReservaModel.findOneAndUpdate(
      {
        'usuario.email': decoded.email,
        fechaInicio: new Date(decoded.fecha),
        servicio: decoded.servicio,
        estado: 'pendiente_email'
      },
      { $set: { estado: 'confirmada' }, $unset: { expiresAt: 1 } },
      { new: true }
    );

    if (!reserva) {
      console.error('Reserva no encontrada con estos datos:', {
        email: decoded.email,
        fecha: decoded.fecha,
        servicio: decoded.servicio
      });
      return res.status(404).json({ error: "Reserva no encontrada" });
    }

    // Respuesta exitosa
    res.json({
      success: true,
      reserva: {
        id: reserva._id,
        servicio: reserva.servicio,
        fecha: reserva.fechaInicio
      }
    });

  } catch (error) {
    console.error('Error completo:', error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

export const deleteReserva = async (
  req: Request<{ id: string }>,
  res: Response<{ success: true } | { error: string }>
) => {
  try {
    const { id } = req.params;
    const { idNegocio } = req.query;
    const query: any = { _id: id };
    if (idNegocio) {
      query.idNegocio = idNegocio as string;
    } else {
      query.idNegocio = { $exists: false };
    }
    const result = await ReservaModel.deleteOne(query);

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

export const cancelarReserva = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const reserva = await ReservaModel.findByIdAndUpdate(
      id,
      { $set: { estado: 'cancelada' } },
      { new: true }
    );

    if (!reserva) {
      return res.status(404).json({ message: 'Reserva no encontrada' });
    }

    res.json(reserva);
  } catch (error) {
    console.error('Error al cancelar reserva por admin:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const cancelarReservaPorToken = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    const reserva = await ReservaModel.findOneAndUpdate(
      { cancellation_token: token, estado: { $ne: 'cancelada' } },
      { $set: { estado: 'cancelada' } },
      { new: true }
    );

    if (!reserva) {
      return res.status(404).json({ message: 'Reserva no encontrada o ya cancelada' });
    }

    res.json({ success: true, message: 'Reserva cancelada correctamente', businessId: reserva.idNegocio });
  } catch (error) {
    console.error('Error al cancelar reserva por token:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const updateReserva = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const reserva = await ReservaModel.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    );

    if (!reserva) {
      return res.status(404).json({ message: 'Reserva no encontrada' });
    }

    res.json(reserva);
  } catch (error) {
    console.error('Error al actualizar reserva:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const getStatistics = async (req: Request, res: Response) => {
  try {
    const { idNegocio, fechaInicio, fechaFin } = req.query;

    if (!idNegocio) {
      return res.status(400).json({ message: 'El idNegocio es requerido' });
    }

    let query: any = { 
      idNegocio: idNegocio as string,
      estado: 'confirmada'
    };

    if (fechaInicio || fechaFin) {
      query.fechaInicio = {};
      if (fechaInicio) {
        query.fechaInicio.$gte = new Date(fechaInicio as string);
      }
      if (fechaFin) {
        query.fechaInicio.$lte = new Date(fechaFin as string);
      }
    }

    const reservas = await ReservaModel.find(query);
    
    const totalFacturado = reservas.reduce((acc, curr) => acc + (curr.precioFinal || 0), 0);
    const totalReservas = reservas.length;

    res.json({
      totalFacturado,
      totalReservas,
      count: reservas.length
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const checkDisponibilidad = async (req: Request, res: Response) => {
  try {
    const { idNegocio, fecha, hora, duracion } = req.query;

    if (!idNegocio || !fecha || !hora || !duracion) {
      return res.status(400).json({ error: 'Faltan parámetros requeridos' });
    }

    const config = await BusinessConfigModel.findOne({ idNegocio: idNegocio as string });
    if (!config) {
      return res.status(404).json({ error: 'Configuración no encontrada' });
    }

    const fechaInicio = new Date(`${fecha}T${hora}:00`);
    const fechaFin = new Date(fechaInicio.getTime() + Number(duracion) * 60000);

    // 1. Validar festivos (con prioridad para horarios especiales)
    const hasSpecialSchedule = config.horariosEspeciales?.some(h => h.fecha === (fecha as string) && h.activo);
    if (!hasSpecialSchedule) {
      const isHoliday = await holidayService.isHoliday(fecha as string, config.provincia);
      if (isHoliday) {
        return res.json(false);
      }
    }

    // 2. Validar antelación mínima
    if (config.antelacionMinimaHoras && config.antelacionMinimaHoras > 0) {
      const minDate = new Date();
      minDate.setHours(minDate.getHours() + config.antelacionMinimaHoras);
      if (fechaInicio < minDate) {
        return res.json(false);
      }
    }

    // 2. Buscar solapamientos
    const overlappingReservas = await ReservaModel.countDocuments({
      idNegocio: idNegocio as string,
      estado: { $in: ['confirmada', 'pendiente_email'] },
      $or: [
        { fechaInicio: { $lt: fechaFin }, fechaFin: { $gt: fechaInicio } },
        { 
          fechaInicio: { $lt: fechaFin }, 
          fechaFin: { $exists: false },
          // Si no tiene fechaFin, asumimos que dura 'duracion' (o lo que tenga guardado)
          $expr: {
            $gt: [
              { $add: ["$fechaInicio", { $multiply: ["$duracion", 60000] }] },
              fechaInicio
            ]
          }
        }
      ]
    });

    if (overlappingReservas >= config.maxReservasPorSlot) {
      return res.json(false);
    }

    return res.json(true);
  } catch (error) {
    console.error('Error en checkDisponibilidad:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const getHolidays = async (req: Request, res: Response) => {
  try {
    const { year, provincia } = req.query;
    if (!year) return res.status(400).json({ error: 'El año es requerido' });
    
    const holidays = await holidayService.getHolidays(Number(year));
    
    // Filtrar por provincia si se proporciona
    const filteredHolidays = holidays.filter(h => {
      if (h.global || h.counties === null) return true;
      if (provincia && h.counties.includes(`ES-${provincia}`)) return true;
      return false;
    });

    res.json(filteredHolidays);
  } catch (error) {
    console.error('Error al obtener festivos:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};