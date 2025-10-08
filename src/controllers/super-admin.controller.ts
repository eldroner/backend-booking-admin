import { Request, Response } from 'express';
import { AllowedBusinessModel } from '../models/allowed-business.model';
import { BusinessConfigModel } from '../models/config.model';
import { ReservaModel } from '../models/reserva.model';
import { sendWelcomeEmail } from '../services/email.service';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

// --- Super Admin Login ---
export const superAdminLogin = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    const superAdminUsername = process.env.SUPER_ADMIN_USERNAME;
    const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD;
    const jwtSecret = process.env.SUPER_ADMIN_JWT_SECRET;

    if (!superAdminUsername || !superAdminPassword || !jwtSecret) {
      return res.status(500).json({ message: 'La configuración de super-administrador no está completa en el servidor.' });
    }

    if (username === superAdminUsername && password === superAdminPassword) {
      const token = jwt.sign(
        { role: 'super-admin' },
        jwtSecret,
        { expiresIn: '8h' }
      );
      return res.json({ token });
    } else {
      return res.status(401).json({ message: 'Credenciales de Super Administrador incorrectas.' });
    }
  } catch (error) {
    console.error('Error en superAdminLogin:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// --- Business Management ---

export const createBusiness = async (req: Request, res: Response) => {
  try {
    const { idNegocio, emailContacto } = req.body;

    if (!idNegocio || !emailContacto) {
      return res.status(400).json({ message: 'idNegocio y emailContacto son requeridos.' });
    }

    // Comprobar duplicados en AMBAS colecciones
    const existingAllowed = await AllowedBusinessModel.findOne({ idNegocio });
    const existingConfig = await BusinessConfigModel.findOne({ idNegocio });

    if (existingAllowed || existingConfig) {
      return res.status(409).json({ message: `El ID de negocio '${idNegocio}' ya está en uso.` });
    }

    // 1. Crear el negocio permitido
    const newBusiness = new AllowedBusinessModel({
      idNegocio,
      emailContacto,
      estado: 'activo',
      subscriptionStatus: 'active',
      cancelAtPeriodEnd: false,
    });

    // 2. Crear la configuración por defecto
    const defaultConfig = new BusinessConfigModel({
      idNegocio: idNegocio,
      nombre: idNegocio,
      slogan: 'Tu eslogan personalizado aquí',
      duracionBase: 30,
      maxReservasPorSlot: 1,
      servicios: [
        { id: 'servicio-1', nombre: 'Servicio 1', duracion: 30 },
        { id: 'servicio-2', nombre: 'Servicio 2', duracion: 60 },
      ],
      horariosNormales: [
        { dia: 1, tramos: [{ horaInicio: '09:00', horaFin: '13:00' }] }, // Lunes
        { dia: 2, tramos: [{ horaInicio: '09:00', horaFin: '13:00' }] }, // Martes
        { dia: 3, tramos: [{ horaInicio: '09:00', horaFin: '13:00' }] }, // Miércoles
        { dia: 4, tramos: [{ horaInicio: '09:00', horaFin: '13:00' }] }, // Jueves
        { dia: 5, tramos: [{ horaInicio: '09:00', horaFin: '13:00' }] }, // Viernes
      ],
    });

    await newBusiness.save();
    await defaultConfig.save();

    // 3. Enviar email de bienvenida
    await sendWelcomeEmail({ to_email: emailContacto, business_id: idNegocio });

    res.status(201).json(newBusiness);

  } catch (error) {
    console.error('Error en createBusiness:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const getAllBusinesses = async (req: Request, res: Response) => {
  try {
    const businesses = await AllowedBusinessModel.find().sort({ fechaCreacion: -1 });
    res.json(businesses);
  } catch (error) {
    console.error('Error en getAllBusinesses:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const deleteBusiness = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Find the business first to get its idNegocio
    const businessToDelete = await AllowedBusinessModel.findById(id);
    if (!businessToDelete) {
      return res.status(404).json({ message: 'Negocio no encontrado.' });
    }
    const { idNegocio } = businessToDelete;

    // Perform all deletions
    await AllowedBusinessModel.findByIdAndDelete(id);
    await BusinessConfigModel.deleteOne({ idNegocio: idNegocio });
    await ReservaModel.deleteMany({ idNegocio: idNegocio });

    res.status(200).json({ message: `Negocio ${idNegocio} y todos sus datos asociados han sido eliminados.` });

  } catch (error) {
    console.error('Error en deleteBusiness:', error);
    res.status(500).json({ message: 'Error interno del servidor durante la eliminación.' });
  }
};


export const resetAdminPassword = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const business = await AllowedBusinessModel.findById(id);

    if (!business) {
      return res.status(404).json({ message: 'Negocio no encontrado.' });
    }

    business.password = undefined;
    await business.save();

    res.status(200).json({ message: `La contraseña para ${business.idNegocio} ha sido eliminada. El administrador podrá establecer una nueva en su próximo inicio de sesión.` });

  } catch (error) {
    console.error('Error en resetAdminPassword:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};
