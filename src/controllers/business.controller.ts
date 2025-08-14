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