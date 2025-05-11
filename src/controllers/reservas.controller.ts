// backend/src/controllers/reservas.controller.ts
import { Request, Response } from 'express';
import { ReservaModel } from '../models/reserva.model';

export const getReservas = async (req: Request, res: Response) => {
  try {
    const reservas = await ReservaModel.find().lean();
    res.json(reservas);
  } catch (error) {
    console.error('Error al obtener reservas:', error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

export const createReserva = async (req: Request, res: Response) => {
  try {
    const nuevaReserva = new ReservaModel(req.body);
    await nuevaReserva.save();
    res.status(201).json(nuevaReserva);
  } catch (error) {
    res.status(400).json({ error: "Error al crear reserva" });
  }
};