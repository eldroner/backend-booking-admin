import { Request, Response } from 'express';
import { BusinessConfigModel } from '../models/config.model';
import { AllowedBusinessModel } from '../models/allowed-business.model';
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
  })).optional(),
  direccion: z.string().optional(),
  descripcion: z.string().optional(),
  fotoUrls: z.array(z.string().url()).optional(),
});

export const getConfig = async (req: Request, res: Response) => {
  try {
    const { idNegocio } = req.query;

    if (!idNegocio) {
      return res.status(400).json({ error: 'El idNegocio es requerido' });
    }

    // 1. Verificar si el negocio está en la lista blanca
    const negocioPermitido = await AllowedBusinessModel.findOne({ idNegocio: idNegocio as string });
    if (!negocioPermitido) {
      return res.status(404).json({ error: 'Negocio no encontrado o no autorizado' });
    }

    // 2. Buscar la configuración específica del negocio
    let config = await BusinessConfigModel.findOne({ idNegocio: idNegocio as string });

    // 3. Si no hay configuración, devolver una por defecto (sin guardarla)
    if (!config) {
      const defaultConfig = {
        idNegocio: idNegocio as string,
        nombre: "Mi Negocio (Sin configurar)",
        duracionBase: 30,
        maxReservasPorSlot: 1,
        servicios: [],
        horariosNormales: Array.from({ length: 7 }, (_, dia) => ({
          dia,
          tramos: dia === 0 || dia === 6 ? [] : 
                 [{ horaInicio: "09:00", horaFin: "13:00" }, 
                  { horaInicio: "15:00", horaFin: "19:00" }]
        })),
        horariosEspeciales: [],
        direccion: "",
        descripcion: "",
        fotoUrls: ["https://github.com/eldroner/mis-assets/main/business.jpg"]
      };
      return res.json(defaultConfig);
    }
    
    // 4. Devolver la configuración existente
    res.json(config);

  } catch (error) {
    console.error('Error getting config:', error);
    res.status(500).json({ error: 'Error al obtener la configuración' });
  }
};

export const updateConfig = async (req: Request, res: Response) => {
  try {
    const { idNegocio } = req.query;

    if (!idNegocio) {
      return res.status(400).json({ error: 'El idNegocio es requerido' });
    }

    // 1. Verificar si el negocio está en la lista blanca
    const negocioPermitido = await AllowedBusinessModel.findOne({ idNegocio: idNegocio as string });
    if (!negocioPermitido) {
      return res.status(403).json({ error: 'No tiene permisos para configurar este negocio' });
    }

    // 2. Validar los datos de entrada
    const validatedData = ConfigSchema.parse(req.body);
    
    // 3. Actualizar o crear la configuración (upsert)
    const updatedConfig = await BusinessConfigModel.findOneAndUpdate(
      { idNegocio: idNegocio as string }, 
      { ...validatedData, idNegocio: idNegocio as string }, 
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    // 4. (Opcional) Marcar el negocio como 'activo' si estaba 'pendiente'
    if (negocioPermitido.estado === 'pendiente') {
      negocioPermitido.estado = 'activo';
      await negocioPermitido.save();
    }
    
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
      error: error instanceof Error ? error.message : 'Error actualizando la configuración' 
    });
  }
};

// Eliminar saveConfig ya que updateConfig hace lo mismo con PUT