// backend/src/controllers/config.controller.ts
import { Request, Response } from 'express';
import { BusinessConfigModel } from '../models/config.model'; // Ruta correcta
import { z } from 'zod';

const ConfigSchema = z.object({
  nombre: z.string(),
  tipoNegocio: z.enum(['peluqueria', 'hotel', 'consulta_medica', 'general']),
  duracionBase: z.number(),
  maxReservasPorSlot: z.number(),
  servicios: z.array(z.object({
    id: z.string(),
    nombre: z.string(),
    duracion: z.number()
  })),
horariosNormales: z.array(z.object({
  dia: z.number(),
  tramos: z.array(z.object({
    horaInicio: z.string(),  // ✅
    horaFin: z.string()      // ✅
  }))
})),
  horariosEspeciales: z.array(z.object({
    fecha: z.string(),
    horaInicio: z.string(),
    horaFin: z.string(),
    activo: z.boolean()
  }))
});

export const updateConfig = async (req: Request, res: Response) => {
  try {
    const validatedData = ConfigSchema.parse(req.body);
    const updatedConfig = await BusinessConfigModel.findOneAndUpdate(
      {}, 
      validatedData, 
      { new: true, upsert: true }
    );
    res.json(updatedConfig);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Error actualizando configuración' });
  }
};

export const getConfig = async (req: Request, res: Response) => {
  try {
    // Versión temporal hardcodeada (eliminar cuando MongoDB funcione)
    const mockConfig = {
      nombre: "Mi Negocio",
      tipoNegocio: "peluqueria",
      duracionBase: 30,
      maxReservasPorSlot: 1,
      servicios: [
        {
          id: "1",
          nombre: "Corte de pelo caballero normal",
          duracion: 30
        },
        {
          id: "2",
          nombre: "Corte de pelo degradados",
          duracion: 60
        },
        {
          id: "3",
          nombre: "Corte de pelo señora + peinado",
          duracion: 60       
        },
        {
          id: "4",
          nombre: "Corte de pelo señora + peinado + tinte",
          duracion: 180         
        }
      ],
      horariosNormales: [
        {
          dia: 0,
          tramos: [
            { horaInicio: "09:00", horaFin: "13:00" },
            { horaInicio: "15:00", horaFin: "19:00" },
          ]
        },
        {
          dia: 1,
          tramos: [
            { horaInicio: "09:00", horaFin: "13:00" },
            { horaInicio: "15:00", horaFin: "19:00" },
          ]
        },
        {
          dia: 2,
          tramos: [
            { horaInicio: "09:00", horaFin: "13:00" },
            { horaInicio: "15:00", horaFin: "19:00" },
          ]
        },
        {
          dia: 3,
          tramos: [
            { horaInicio: "09:00", horaFin: "13:00" },
            { horaInicio: "15:00", horaFin: "19:00" },
          ]
        },
        {
          dia: 4,
          tramos: [
            { horaInicio: "09:00", horaFin: "13:00" },
            { horaInicio: "15:00", horaFin: "19:00" },
          ]
        },
        {
          dia: 5,
          tramos: [
            { horaInicio: "09:00", horaFin: "13:00" },
            { horaInicio: "15:00", horaFin: "19:00" },
          ]
        },
        {
          dia: 6,
          tramos: [
            { horaInicio: "09:00", horaFin: "13:00" },
            { horaInicio: "15:00", horaFin: "19:00" },
          ]
        }

      ],
      horariosEspeciales: []
    };
    
    res.json(mockConfig);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener configuración' });
  }
};

export const saveConfig = async (req: Request, res: Response) => {
  try {
    const validatedData = ConfigSchema.parse(req.body);
    const newConfig = new BusinessConfigModel(validatedData);
    await newConfig.save();
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Datos inválidos' });
  }
};