import { Request, Response } from 'express';
import { AllowedBusinessModel } from '../models/allowed-business.model';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import Stripe from 'stripe';

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

    // Update email in our database
    business.emailContacto = newEmail;
    await business.save();

    // Update email in Stripe if a customer ID exists
    if (business.stripeSubscriptionId) {
      // We need the customer ID, not the subscription ID to update customer email
      // This assumes the customer ID is linked to the subscription or can be retrieved.
      // For simplicity, we'll assume we can get the customer ID from the subscription.
      // In a real app, you might store customerId directly on the AllowedBusinessModel.
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

    console.log('Received password update request body:', req.body);
    const { currentPassword } = UpdatePasswordSchema.parse(req.body); // Only parse currentPassword
    const newPassword: string | undefined = req.body.newPassword; // Access directly
    const confirmPassword: string | undefined = req.body.confirmPassword; // Access directly

    // Ensure passwords are strings before trimming
    const trimmedNewPassword = newPassword !== undefined ? String(newPassword).trim() : undefined;
    const trimmedConfirmPassword = confirmPassword !== undefined ? String(confirmPassword).trim() : undefined;

    if (trimmedNewPassword === undefined || trimmedConfirmPassword === undefined) {
      return res.status(400).json({ message: 'Las contraseñas no pueden ser indefinidas.' });
    }

    console.log('Backend - trimmedNewPassword:', trimmedNewPassword, 'length:', trimmedNewPassword.length);
    console.log('Backend - trimmedConfirmPassword:', trimmedConfirmPassword, 'length:', trimmedConfirmPassword.length);
    console.log('Backend - Comparison result (trimmedNewPassword === trimmedConfirmPassword):', trimmedNewPassword === trimmedConfirmPassword);

    // Manual check for password mismatch
    if (trimmedNewPassword !== trimmedConfirmPassword) {
      return res.status(400).json({ message: 'Las nuevas contraseñas no coinciden.' });
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
    const hashedPassword = await bcrypt.hash(trimmedNewPassword, 10);

    // Update password in our database
    business.password = hashedPassword;
    await business.save();

    res.status(200).json({ message: 'Contraseña actualizada correctamente.' });

  } catch (error) {
    console.error('Error updating admin password:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message });
    }
    res.status(500).json({ message: 'Error interno del servidor al actualizar la contraseña.' });
  }
};