
import { Request, Response } from 'express';
import Bloqueo, { IBloqueo } from '../models/bloqueo.model';

// Obtener todas las fechas bloqueadas
export const getFechasBloqueadas = async (req: Request, res: Response) => {
  try {
    const { idNegocio } = req.query; // Obtener idNegocio de los query parameters
    let query: any = {};

    const idNegocioConditions = [];
    if (idNegocio) {
      idNegocioConditions.push({ idNegocio: idNegocio as string });
    }
    idNegocioConditions.push({ idNegocio: { $exists: false } }); // Incluir fechas globales

    query = { $or: idNegocioConditions };

    const bloqueos = await Bloqueo.find(query);
    res.json(bloqueos.map(b => b.fecha.toISOString().split('T')[0]));
  } catch (error) {
    console.error('Error al obtener fechas bloqueadas:', error);
    res.status(500).send('Error interno del servidor');
  }
};

// Crear una nueva fecha bloqueada
export const addFechaBloqueada = async (req: Request, res: Response) => {
  try {
    const { fecha, idNegocio } = req.body;
    // Convertir la fecha a un objeto Date que represente la medianoche UTC
    const fechaUTC = new Date(fecha);
    fechaUTC.setUTCHours(0, 0, 0, 0);

    const newBloqueo = new Bloqueo({ fecha: fechaUTC, idNegocio });
    await newBloqueo.save();
    res.status(201).json(newBloqueo);
  } catch (error) {
    console.error('Error al añadir fecha bloqueada:', error);
    res.status(500).send('Error interno del servidor');
  }
};

// Eliminar una fecha bloqueada
export const deleteFechaBloqueada = async (req: Request, res: Response) => {
  try {
    const { fecha } = req.params;
    const { idNegocio } = req.query;

    // Convertir la fecha de los parámetros a un objeto Date que represente la medianoche UTC
    const fechaUTC = new Date(fecha);
    fechaUTC.setUTCHours(0, 0, 0, 0);

    let query: any = { fecha: fechaUTC };

    const idNegocioConditions = [];
    if (idNegocio) {
      idNegocioConditions.push({ idNegocio: idNegocio as string });
    }
    idNegocioConditions.push({ idNegocio: { $exists: false } });

    query = {
      fecha: fechaUTC,
      $or: idNegocioConditions
    };

    const result = await Bloqueo.findOneAndDelete(query);
    if (!result) {
      return res.status(404).send('Fecha no encontrada');
    }
    res.status(200).send('Fecha desbloqueada');
  } catch (error) {
    console.error('Error al eliminar fecha bloqueada:', error);
    res.status(500).send('Error interno del servidor');
  }
};
