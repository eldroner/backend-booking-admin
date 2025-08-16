import { Request, Response } from 'express';
import { AllowedBusinessModel } from '../models/allowed-business.model';
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

    const existingBusiness = await AllowedBusinessModel.findOne({ $or: [{ idNegocio }, { emailContacto }] });
    if (existingBusiness) {
      return res.status(409).json({ message: 'Ya existe un negocio con ese idNegocio o emailContacto.' });
    }

    const newBusiness = new AllowedBusinessModel({
      idNegocio,
      emailContacto,
      estado: 'activo' // Lo creamos como activo directamente
    });

    await newBusiness.save();

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
    const deletedBusiness = await AllowedBusinessModel.findByIdAndDelete(id);

    if (!deletedBusiness) {
      return res.status(404).json({ message: 'Negocio no encontrado.' });
    }

    // Opcional: Eliminar también la configuración del negocio en BusinessConfigModel
    // await BusinessConfigModel.deleteOne({ idNegocio: deletedBusiness.idNegocio });

    res.status(200).json({ message: `Negocio ${deletedBusiness.idNegocio} eliminado correctamente.` });
  } catch (error) {
    console.error('Error en deleteBusiness:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
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
