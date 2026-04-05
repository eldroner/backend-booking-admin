import { Request, Response } from 'express';
import { AllowedBusinessModel } from '../models/allowed-business.model';
import { BusinessConfigModel } from '../models/config.model';

enum BusinessType {
  PELUQUERIA = 'peluqueria',
  HOTEL = 'hotel',
  CONSULTA = 'consulta_medica',
  GENERAL = 'general'
}

export const initializeBusiness = async (req: Request, res: Response) => {
  try {
    const { idNegocio, emailContacto } = req.body;

    if (!idNegocio || !emailContacto) {
      return res.status(400).json({ message: 'idNegocio y emailContacto son requeridos.' });
    }

    // 1. Crear o actualizar AllowedBusiness
    let allowedBusiness = await AllowedBusinessModel.findOne({ idNegocio });
    if (!allowedBusiness) {
      allowedBusiness = new AllowedBusinessModel({ idNegocio, emailContacto, estado: 'activo' });
      await allowedBusiness.save();
    } else if (allowedBusiness.emailContacto !== emailContacto) {
      // Opcional: Actualizar emailContacto si ha cambiado
      allowedBusiness.emailContacto = emailContacto;
      await allowedBusiness.save();
    }

    // 2. Crear BusinessConfig por defecto si no existe
    let businessConfig = await BusinessConfigModel.findOne({ idNegocio });
    if (!businessConfig) {
      const defaultConfig = {
        idNegocio,
        nombre: `Negocio ${idNegocio}`,
        tipoNegocio: BusinessType.GENERAL,
        duracionBase: 30,
        maxReservasPorSlot: 1,
        servicios: [],
        horariosNormales: [],
        horariosEspeciales: []
      };
      businessConfig = new BusinessConfigModel(defaultConfig);
      await businessConfig.save();
    }

    res.status(200).json({ message: 'Negocio inicializado correctamente', idNegocio });

  } catch (error) {
    console.error('Error al inicializar negocio:', error);
    res.status(500).json({ message: 'Error interno del servidor al inicializar negocio.' });
  }
};

/** Estado operativo público (pausa, gracia de pago) para la vista cliente y admin. */
export const getOperationalStatus = async (req: Request, res: Response) => {
  try {
    const { idNegocio } = req.query;
    if (!idNegocio || typeof idNegocio !== 'string') {
      return res.status(400).json({ error: 'idNegocio es requerido' });
    }

    const business = await AllowedBusinessModel.findOne({ idNegocio });
    if (!business) {
      return res.status(404).json({ error: 'Negocio no encontrado' });
    }

    const now = new Date();
    const pausedActive = !!(business.pausedUntil && business.pausedUntil > now);

    res.json({
      pausedUntil: business.pausedUntil ? business.pausedUntil.toISOString() : null,
      billingGraceEndsAt: business.billingGraceEndsAt ? business.billingGraceEndsAt.toISOString() : null,
      newBookingsBlocked: pausedActive,
    });
  } catch (error) {
    console.error('Error en getOperationalStatus:', error);
    res.status(500).json({ error: 'Error al obtener el estado operativo' });
  }
};

const MAX_PAUSE_DAYS = 365;

/** Programa o cancela la pausa del negocio (sin nuevas reservas hasta la fecha). */
export const updateBusinessPause = async (req: Request, res: Response) => {
  try {
    const idNegocio = req.idNegocio;
    if (!idNegocio) {
      return res.status(401).json({ message: 'No autorizado' });
    }

    const { pausedUntil } = req.body as { pausedUntil?: string | null };

    if (pausedUntil === null || pausedUntil === undefined || pausedUntil === '') {
      await AllowedBusinessModel.updateOne({ idNegocio }, { $unset: { pausedUntil: 1 } });
      return res.json({ message: 'Pausa desactivada', pausedUntil: null });
    }

    const d = new Date(pausedUntil);
    if (isNaN(d.getTime())) {
      return res.status(400).json({ error: 'Fecha de fin de pausa no válida' });
    }

    const now = new Date();
    if (d <= now) {
      return res.status(400).json({ error: 'La fecha de fin de pausa debe ser futura' });
    }

    const maxEnd = new Date();
    maxEnd.setDate(maxEnd.getDate() + MAX_PAUSE_DAYS);
    if (d > maxEnd) {
      return res.status(400).json({ error: `La pausa no puede superar ${MAX_PAUSE_DAYS} días` });
    }

    await AllowedBusinessModel.updateOne({ idNegocio }, { $set: { pausedUntil: d } });
    res.json({ message: 'Pausa programada correctamente', pausedUntil: d.toISOString() });
  } catch (error) {
    console.error('Error en updateBusinessPause:', error);
    res.status(500).json({ error: 'Error al actualizar la pausa' });
  }
};