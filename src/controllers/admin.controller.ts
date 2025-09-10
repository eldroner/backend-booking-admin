import { Request, Response } from 'express';
import { AllowedBusinessModel } from '../models/allowed-business.model';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import Stripe from 'stripe';
import { sendEmailChangedEmail, sendPasswordChangedEmail } from '../services/email.service';

const stripe = new Stripe(process.env.STRIPE_API_KEY || '', {
  apiVersion: '2024-04-10',
});

// Zod schema for email update validation
const UpdateEmailSchema = z.object({
  newEmail: z.string().email("Formato de email inválido"),
  currentPassword: z.string().min(1, "La contraseña actual es requerida"),
});

// Zod schema for password update validation (simplified for manual comparison)
const UpdatePasswordSchema = z.object({
  currentPassword: z.string().min(1, "La contraseña actual es requerida"),
});

export const updateAdminEmail = async (req: Request, res: Response) => {
  try {
    const idNegocio = req.idNegocio;
    if (!idNegocio) {
      return res.status(401).json({ message: 'No autorizado: ID de negocio no encontrado en el token.' });
    }

    const { newEmail, currentPassword } = UpdateEmailSchema.parse(req.body);

    const business = await AllowedBusinessModel.findOne({ idNegocio });

    if (!business) {
      return res.status(404).json({ message: 'Negocio no encontrado.' });
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, business.password || '');
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Contraseña actual incorrecta.' });
    }

    // Check if new email is already in use by another business
    const emailExists = await AllowedBusinessModel.findOne({ emailContacto: newEmail });
    if (emailExists && emailExists.idNegocio !== idNegocio) {
      return res.status(409).json({ message: 'El nuevo email ya está en uso por otro negocio.' });
    }

    const oldEmail = business.emailContacto; // Store old email

    // Update email in our database
    business.emailContacto = newEmail;
    await business.save();

    // Send notification email
    if (oldEmail) {
        sendEmailChangedEmail({
            to_email: oldEmail,
            new_email: newEmail,
            business_name: business.idNegocio
        }).catch(err => console.error("Failed to send email change notification:", err));
    }

    // Update email in Stripe if a customer ID exists
    if (business.stripeSubscriptionId) {
      const subscription = await stripe.subscriptions.retrieve(business.stripeSubscriptionId);
      if (subscription && subscription.customer) {
        await stripe.customers.update(subscription.customer as string, { email: newEmail });
      }
    }

    res.status(200).json({ message: 'Email actualizado correctamente.' });

  } catch (error) {
    console.error('Error updating admin email:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message });
    }
    res.status(500).json({ message: 'Error interno del servidor al actualizar el email.' });
  }
};

export const updateAdminPassword = async (req: Request, res: Response) => {
  try {
    const idNegocio = req.idNegocio;
    if (!idNegocio) {
      return res.status(401).json({ message: 'No autorizado: ID de negocio no encontrado en el token.' });
    }

    const { currentPassword } = UpdatePasswordSchema.parse(req.body);
    const newPassword = req.body.newPassword as string | undefined;

    if (!newPassword || newPassword.trim() !== req.body.confirmPassword?.trim()) {
        return res.status(400).json({ message: 'Las nuevas contraseñas no coinciden o están vacías.' });
    }

    const business = await AllowedBusinessModel.findOne({ idNegocio });

    if (!business) {
      return res.status(404).json({ message: 'Negocio no encontrado.' });
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, business.password || '');
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Contraseña actual incorrecta.' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword.trim(), 10);

    // Update password in our database
    business.password = hashedPassword;
    await business.save();

    // Send notification email
    if (business.emailContacto) {
        sendPasswordChangedEmail({
            to_email: business.emailContacto,
            business_name: business.idNegocio
        }).catch(err => console.error("Failed to send password change notification:", err));
    }

    res.status(200).json({ message: 'Contraseña actualizada correctamente.' });

  } catch (error) {
    console.error('Error updating admin password:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message });
    }
    res.status(500).json({ message: 'Error interno del servidor al actualizar la contraseña.' });
  }
};