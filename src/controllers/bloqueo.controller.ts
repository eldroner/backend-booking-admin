
import { Request, Response } from 'express';
import Bloqueo, { IBloqueo } from '../models/bloqueo.model';

// Obtener todas las fechas bloqueadas
export const getFechasBloqueadas = async (req: Request, res: Response) => {
  try {
    const bloqueos = await Bloqueo.find();
    res.json(bloqueos.map(b => b.fecha.toISOString().split('T')[0]));
  } catch (error) {
    res.status(500).send(error);
  }
};

// Crear una nueva fecha bloqueada
export const addFechaBloqueada = async (req: Request, res: Response) => {
  try {
    const { fecha } = req.body;
    const newBloqueo = new Bloqueo({ fecha });
    await newBloqueo.save();
    res.status(201).json(newBloqueo);
  } catch (error) {
    res.status(500).send(error);
  }
};

// Eliminar una fecha bloqueada
export const deleteFechaBloqueada = async (req: Request, res: Response) => {
  try {
    const { fecha } = req.params;
    const result = await Bloqueo.findOneAndDelete({ fecha: new Date(fecha) });
    if (!result) {
      return res.status(404).send('Fecha no encontrada');
    }
    res.status(200).send('Fecha desbloqueada');
  } catch (error) {
    res.status(500).send(error);
  }
};
