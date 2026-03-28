import { Request, Response } from 'express';
import { StaffModel } from '../models/staff.model';

export const getStaff = async (req: Request, res: Response) => {
  try {
    const { idNegocio } = req.query;
    if (!idNegocio || typeof idNegocio !== 'string') {
      return res.status(400).json({ error: 'El idNegocio es requerido' });
    }

    const staff = await StaffModel.find({ idNegocio, activo: true });
    res.json(staff);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener el equipo' });
  }
};

export const addStaff = async (req: Request, res: Response) => {
  try {
    const idNegocio = req.idNegocio;
    if (!idNegocio) {
      return res.status(401).json({ error: 'No autorizado: negocio no identificado' });
    }

    const { nombre, rol, fotoUrl, serviciosIds } = req.body;
    const newStaff = new StaffModel({
      idNegocio,
      nombre,
      rol,
      fotoUrl,
      serviciosIds: serviciosIds ?? []
    });
    await newStaff.save();
    res.status(201).json(newStaff);
  } catch (error) {
    res.status(500).json({ error: 'Error al añadir miembro del equipo' });
  }
};

export const updateStaff = async (req: Request, res: Response) => {
  try {
    const idNegocio = req.idNegocio;
    if (!idNegocio) {
      return res.status(401).json({ error: 'No autorizado: negocio no identificado' });
    }

    const { id } = req.params;
    const { nombre, rol, fotoUrl, serviciosIds } = req.body as {
      nombre?: string;
      rol?: string;
      fotoUrl?: string;
      serviciosIds?: string[];
    };
    const payload: Record<string, unknown> = {};
    if (nombre !== undefined) payload.nombre = nombre;
    if (rol !== undefined) payload.rol = rol;
    if (fotoUrl !== undefined) payload.fotoUrl = fotoUrl;
    if (serviciosIds !== undefined) payload.serviciosIds = serviciosIds;

    if (Object.keys(payload).length === 0) {
      const existing = await StaffModel.findOne({ _id: id, idNegocio });
      if (!existing) return res.status(404).json({ error: 'Miembro no encontrado' });
      return res.json(existing);
    }

    const updatedStaff = await StaffModel.findOneAndUpdate(
      { _id: id, idNegocio },
      { $set: payload },
      { new: true, runValidators: true }
    );
    if (!updatedStaff) return res.status(404).json({ error: 'Miembro no encontrado' });
    res.json(updatedStaff);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar miembro del equipo' });
  }
};

export const deleteStaff = async (req: Request, res: Response) => {
  try {
    const idNegocio = req.idNegocio;
    if (!idNegocio) {
      return res.status(401).json({ error: 'No autorizado: negocio no identificado' });
    }

    const { id } = req.params;
    const updatedStaff = await StaffModel.findOneAndUpdate(
      { _id: id, idNegocio },
      { activo: false },
      { new: true }
    );
    if (!updatedStaff) return res.status(404).json({ error: 'Miembro no encontrado' });
    res.json({ message: 'Miembro eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar miembro del equipo' });
  }
};
