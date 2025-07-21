import { Request, Response } from 'express';
import { BusinessConfigModel } from '../models/config.model';
import { z } from 'zod';

const ConfigSchema = z.object({
  nombre: z.string().min(1),
  duracionBase: z.number().min(5),
  maxReservasPorSlot: z.number().min(1),
  servicios: z.array(z.object({
    id: z.string().min(1),
    nombre: z.string().min(1),
    duracion: z.number().min(5)
  })),
  horariosNormales: z.array(z.object({
    dia: z.number().min(0).max(6),
    tramos: z.array(z.object({
      horaInicio: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
      horaFin: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    })).min(1)
  })).min(1),
  horariosEspeciales: z.array(z.object({
    fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    horaInicio: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
    horaFin: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
    activo: z.boolean()
  })).optional()
});

export const getConfig = async (req: Request, res: Response) => {
  try {
    const { idNegocio } = req.query;
    let config;

    if (idNegocio) {
      // Intenta encontrar la configuración específica del negocio
      config = await BusinessConfigModel.findOne({ idNegocio: idNegocio as string });
    }

    if (!config) {
      // Si no se encontró la configuración específica, busca la configuración antigua (sin idNegocio)
      config = await BusinessConfigModel.findOne({ idNegocio: { $exists: false } });
    }
    
    if (!config) {
      // Si no existe ninguna configuración, crea una por defecto con idNegocio: 'default'
      const defaultConfig = await BusinessConfigModel.create({
        idNegocio: 'default',
        nombre: "Mi Negocio",
        duracionBase: 30,
        maxReservasPorSlot: 1,
        servicios: [],
        horariosNormales: Array.from({ length: 7 }, (_, dia) => ({
          dia,
          tramos: dia === 0 ? [{ horaInicio: "00:00", horaFin: "00:00" }] : 
                 dia === 6 ? [{ horaInicio: "10:00", horaFin: "14:00" }] : 
                 [{ horaInicio: "09:00", horaFin: "13:00" }, 
                  { horaInicio: "15:00", horaFin: "19:00" }]
        })),
        horariosEspeciales: []
      });
      
      return res.json(defaultConfig);
    }
    
    // Sanear la configuración existente para cumplir con la validación de Zod
    const sanitizedConfig = config.toObject(); // Convertir a objeto JS plano
    sanitizedConfig.horariosNormales = sanitizedConfig.horariosNormales.map(horarioDia => {
      if (horarioDia.tramos.length === 0) {
        return { ...horarioDia, tramos: [{ horaInicio: "00:00", horaFin: "00:00" }] };
      }
      return horarioDia;
    });

    res.json(sanitizedConfig);
  } catch (error) {
    console.error('Error getting config:', error);
    res.status(500).json({ error: 'Error al obtener configuración' });
  }
};

export const updateConfig = async (req: Request, res: Response) => {
  try {
    const { idNegocio } = req.query;
    const query = idNegocio ? { idNegocio: idNegocio as string } : { idNegocio: { $exists: false } };

    // Validación con Zod
    const validatedData = ConfigSchema.parse(req.body);
    
    // Actualizar o crear la configuración
    const updatedConfig = await BusinessConfigModel.findOneAndUpdate(
      query, 
      { ...validatedData, ...(idNegocio && { idNegocio }) }, 
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    
    res.json(updatedConfig);
  } catch (error) {
    console.error('Error updating config:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Datos inválidos',
        details: error.errors 
      });
    }
    
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Error actualizando configuración' 
    });
  }
};

// Eliminar saveConfig ya que updateConfig hace lo mismo con PUT