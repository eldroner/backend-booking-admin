import { Request, Response } from 'express';
import { AllowedBusinessModel } from '../models/allowed-business.model';
import jwt from 'jsonwebtoken';

export const loginByEmail = async (req: Request, res: Response) => {
  try {
    const { emailContacto } = req.body;

    if (!emailContacto) {
      return res.status(400).json({ message: 'El email de contacto es requerido' });
    }

    const business = await AllowedBusinessModel.findOne({ emailContacto });

    if (!business) {
      return res.status(401).json({ message: 'Email no registrado como administrador' });
    }

    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET no está configurado en las variables de entorno');
    }

    const token = jwt.sign(
      { idNegocio: business.idNegocio, emailContacto: business.emailContacto },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({ token, idNegocio: business.idNegocio });

  } catch (error) {
    console.error('Error en loginByEmail:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};
