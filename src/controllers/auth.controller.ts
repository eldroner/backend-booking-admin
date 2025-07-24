import { Request, Response } from 'express';
import { AllowedBusinessModel } from '../models/allowed-business.model';
import { BusinessConfigModel } from '../models/config.model'; // Importar el modelo de configuración
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

enum BusinessType {
  PELUQUERIA = 'peluqueria',
  HOTEL = 'hotel',
  CONSULTA = 'consulta_medica',
  GENERAL = 'general'
}

export const loginByEmail = async (req: Request, res: Response) => {
  try {
    const { emailContacto, password } = req.body;

    if (!emailContacto) {
      return res.status(400).json({ message: 'El email de contacto es requerido' });
    }

    const business = await AllowedBusinessModel.findOne({ emailContacto });

    if (!business) {
      return res.status(401).json({ message: 'Email no registrado como administrador' });
    }

    // Lógica de verificación de contraseña
    if (business.password) { // Si el negocio tiene una contraseña establecida
      if (!password) {
        return res.status(400).json({ message: 'Contraseña requerida' });
      }
      const isPasswordValid = await bcrypt.compare(password, business.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: 'Contraseña incorrecta' });
      }
    } else { // Si el negocio no tiene contraseña, y se proporciona una, la guardamos
      if (password) {
        const hashedPassword = await bcrypt.hash(password, 10); // 10 es el saltRounds
        business.password = hashedPassword;
        await business.save();
      }
    }

    // --- NUEVA LÓGICA: Crear BusinessConfig por defecto si no existe ---
    let businessConfig = await BusinessConfigModel.findOne({ idNegocio: business.idNegocio });
    if (!businessConfig) {
      const defaultConfig = {
        idNegocio: business.idNegocio,
        nombre: `Negocio ${business.idNegocio}`,
        tipoNegocio: BusinessType.GENERAL,
        duracionBase: 30,
        maxReservasPorSlot: 1,
        servicios: [],
        horariosNormales: [],
        horariosEspeciales: []
      };
      businessConfig = new BusinessConfigModel(defaultConfig);
      await businessConfig.save();
      console.log(`BusinessConfig por defecto creado para ${business.idNegocio} al iniciar sesión.`);
    }
    // --- FIN NUEVA LÓGICA ---

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
