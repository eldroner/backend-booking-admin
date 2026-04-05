import { Request, Response } from 'express';
import { AllowedBusinessModel } from '../models/allowed-business.model';
import { BusinessConfigModel } from '../models/config.model';
import { ReservaModel } from '../models/reserva.model';
import { sendWelcomeEmail, sendManualBillingActivationEmail } from '../services/email.service';
import { createStripeSubscriptionCheckoutUrl } from './payment.controller';
import jwt from 'jsonwebtoken';

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

    // 1. Crear el negocio permitido (sin Stripe hasta que el cliente pague tras la invitación)
    const newBusiness = new AllowedBusinessModel({
      idNegocio,
      emailContacto,
      estado: 'activo',
      billingOnboardingSource: 'super_admin',
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


async function runStripeActivationInviteForBusiness(mongoId: string): Promise<void> {
  const business = await AllowedBusinessModel.findById(mongoId);
  if (!business) {
    throw new Error('Negocio no encontrado');
  }
  if (business.stripeSubscriptionId) {
    throw new Error('Este negocio ya tiene suscripción de pago en Stripe');
  }
  if (business.billingOnboardingSource === 'stripe_self_serve') {
    throw new Error('Los negocios dados de alta por la web no usan esta invitación');
  }

  const checkoutUrl = await createStripeSubscriptionCheckoutUrl(business.idNegocio, business.emailContacto);
  const config = await BusinessConfigModel.findOne({ idNegocio: business.idNegocio }).select('nombre').lean();
  const displayName = (config?.nombre && String(config.nombre).trim()) || business.idNegocio;

  await sendManualBillingActivationEmail({
    to_email: business.emailContacto,
    business_display_name: displayName,
    id_negocio: business.idNegocio,
    checkout_url: checkoutUrl,
  });

  business.stripeBillingInviteSentAt = new Date();
  await business.save();
}

/** Envía email con enlace Stripe: 30 días de prueba tras pagar; no borra datos existentes. */
export const sendStripeActivationInvite = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await runStripeActivationInviteForBusiness(id);
    res.json({ message: 'Invitación de pago enviada al email del negocio.' });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    if (msg === 'Negocio no encontrado') {
      return res.status(404).json({ message: msg });
    }
    if (
      msg.includes('ya tiene suscripción') ||
      msg.includes('no usan esta invitación')
    ) {
      return res.status(400).json({ message: msg });
    }
    console.error('Error en sendStripeActivationInvite:', error);
    res.status(500).json({ message: 'Error al enviar la invitación o al crear la sesión de pago.' });
  }
};

export const sendBulkStripeActivationInvites = async (req: Request, res: Response) => {
  try {
    const { ids } = req.body as { ids?: string[] };
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'Se requiere un array "ids" con al menos un elemento.' });
    }

    const results: { id: string; ok: boolean; message?: string }[] = [];
    for (const rawId of ids) {
      const id = String(rawId);
      try {
        await runStripeActivationInviteForBusiness(id);
        results.push({ id, ok: true });
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Error desconocido';
        results.push({ id, ok: false, message: msg });
      }
    }

    res.json({ results });
  } catch (error) {
    console.error('Error en sendBulkStripeActivationInvites:', error);
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
