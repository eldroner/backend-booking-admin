import { Request, Response } from 'express';
import { BusinessConfigModel } from '../models/config.model';
import { z } from 'zod';

const ConfigSchema = z.object({
  nombre: z.string().min(1),
  tipoNegocio: z.enum(['peluqueria', 'hotel', 'consulta_medica', 'general']),
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
    const config = await BusinessConfigModel.findOne();
    
    if (!config) {
      // Si no existe configuración, crea una por defecto
      const defaultConfig = await BusinessConfigModel.create({
        nombre: "Mi Negocio",
        tipoNegocio: "peluqueria",
        duracionBase: 30,
        maxReservasPorSlot: 1,
        servicios: [],
        horariosNormales: Array.from({ length: 7 }, (_, dia) => ({
          dia,
          tramos: dia === 6 ? [{ horaInicio: "10:00", horaFin: "14:00" }] : 
                 dia === 0 ? [] : // Domingo cerrado
                 [{ horaInicio: "09:00", horaFin: "13:00" }, 
                  { horaInicio: "15:00", horaFin: "19:00" }]
        })),
        horariosEspeciales: []
      });
      
      return res.json(defaultConfig);
    }
    
    res.json(config);
  } catch (error) {
    console.error('Error getting config:', error);
    res.status(500).json({ error: 'Error al obtener configuración' });
  }
};

export const updateConfig = async (req: Request, res: Response) => {
  try {
    // Validación con Zod
    const validatedData = ConfigSchema.parse(req.body);
    
    // Actualizar o crear la configuración
    const updatedConfig = await BusinessConfigModel.findOneAndUpdate(
      {}, 
      validatedData, 
      { new: true, upsert: true }
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