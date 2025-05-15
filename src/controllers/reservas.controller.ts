import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { ReservaModel } from '../models/reserva.model';
import { v4 as uuidv4 } from 'uuid';

export const getReservas = async (req: Request, res: Response) => {
  try {
    const reservas = await ReservaModel.find().lean();
    
    const reservasFormateadas = reservas.map(reserva => {
      // Verificación adicional para evitar errores
      if (!reserva._id) {
        console.error('Reserva sin _id:', reserva);
        throw new Error('Reserva sin identificador');
      }
      
      return {
        id: reserva._id.toString(),
        usuario: reserva.usuario,
        fechaInicio: reserva.fechaInicio,
        servicio: reserva.servicio,
        estado: reserva.estado || 'confirmada' // Valor por defecto
      };
    });
    
    res.json(reservasFormateadas);
  } catch (error) {
    console.error('Error en getReservas:', error);
    res.status(500).json({ 
      error: "Error al obtener reservas",
      detalles: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

export const createReserva = async (req: Request, res: Response) => {
  try {
    // Validación básica del cuerpo de la petición
    if (!req.body.usuario || !req.body.fechaInicio || !req.body.servicio) {
      return res.status(400).json({ error: "Datos incompletos" });
    }

    const reservaData = {
      _id: uuidv4(),
      usuario: {
        nombre: req.body.usuario.nombre,
        email: req.body.usuario.email,
        telefono: req.body.usuario.telefono || ''
      },
      fechaInicio: new Date(req.body.fechaInicio),
      servicio: req.body.servicio,
      estado: 'confirmada'
    };

    const nuevaReserva = new ReservaModel(reservaData);
    await nuevaReserva.save();
    
    // Preparar respuesta sin usar _id
    const reservaParaFrontend = {
      id: nuevaReserva._id.toString(),
      usuario: nuevaReserva.usuario,
      fechaInicio: nuevaReserva.fechaInicio,
      servicio: nuevaReserva.servicio,
      estado: nuevaReserva.estado
    };
    
    res.status(201).json(reservaParaFrontend);
  } catch (error) {
    console.error('Error en createReserva:', error);
    res.status(400).json({ 
      error: "Error al crear reserva",
      detalles: error instanceof Error ? error.message : 'Error de validación'
    });
  }
};

export const deleteReserva = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "ID de reserva inválido" });
    }

    const objectId = new mongoose.Types.ObjectId(id);
    const result = await ReservaModel.deleteOne({ _id: objectId });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Reserva no encontrada" });
    }
    
    res.json({ success: true });
  } catch (error) {
    // Solución para el tipo 'unknown'
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Error desconocido al eliminar reserva';
    
    console.error('Error en deleteReserva:', error);
    res.status(500).json({ 
      error: "Error al eliminar reserva",
      detalles: errorMessage  // Ahora seguro que es string
    });
  }
};