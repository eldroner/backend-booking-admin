
import { Request, Response } from 'express';
import Servicio from '../models/servicios.model';

// Obtener todos los servicios
export const getServicios = async (req: Request, res: Response) => {
  try {
    const { idNegocio } = req.query;
    const query: any = idNegocio ? { idNegocio: idNegocio as string } : { idNegocio: { $exists: false } };
    const servicios = await Servicio.find(query);
    res.json(servicios);
  } catch (error) {
    res.status(500).send(error);
  }
};

// Crear un nuevo servicio
export const addServicio = async (req: Request, res: Response) => {
  try {
    const { nombre, duracion, idNegocio } = req.body;
    const newServicio = new Servicio({ nombre, duracion, ...(idNegocio && { idNegocio }) });
    await newServicio.save();
    res.status(201).json(newServicio);
  } catch (error) {
    res.status(500).send(error);
  }
};

// Eliminar un servicio
export const deleteServicio = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { idNegocio } = req.query; // Asumiendo que el id del negocio viene como query param
    const query: any = { _id: id };
    if (idNegocio) {
      query.idNegocio = idNegocio as string;
    } else {
      query.idNegocio = { $exists: false };
    }
    const result = await Servicio.findOneAndDelete(query);
    if (!result) {
      return res.status(404).send('Servicio no encontrado');
    }
    res.status(200).send('Servicio eliminado');
  } catch (error) {
    res.status(500).send(error);
  }
};
