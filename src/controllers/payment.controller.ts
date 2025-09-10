import { Request, Response } from 'express';
import Stripe from 'stripe';

import { AllowedBusinessModel } from '../models/allowed-business.model';
import { BusinessConfigModel } from '../models/config.model';
import { sendWelcomeEmail } from '../services/email.service';

const stripe = new Stripe(process.env.STRIPE_API_KEY || '', {
  apiVersion: '2024-04-10',
});

export const createCheckoutSession = async (req: Request, res: Response) => {
  const { businessId, userEmail } = req.body;
  const plan = { priceId: 'price_1S0SDxDz9N5vmn9tXiypiQNh' };

  if (!businessId || !userEmail) {
    return res.status(400).json({ error: 'Invalid input: businessId and userEmail are required.' });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: plan.priceId, quantity: 1 }],
      mode: 'subscription',
      subscription_data: { trial_period_days: 30 },
      success_url: `${process.env.FRONTEND_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/payment-cancelled`,
      metadata: { businessId, userEmail, planName: 'default' },
    });
    res.status(200).json({ url: session.url });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(500).json({ error: `Stripe Error: ${errorMessage}` });
  }
};

const handleSubscriptionChange = async (subscription: Stripe.Subscription) => {
  const { id, status, current_period_end, cancel_at_period_end } = subscription;
  const business = await AllowedBusinessModel.findOne({ stripeSubscriptionId: id });

  if (business) {
    business.subscriptionStatus = status as 'trialing' | 'active' | 'canceled' | 'paused' | 'unpaid';
    business.periodEndDate = new Date(current_period_end * 1000);
    business.cancelAtPeriodEnd = cancel_at_period_end;
    await business.save();
    console.log(`Subscription ${id} for business ${business.idNegocio} updated to ${status}.`);
  } else {
    console.warn(`Webhook for subscription ${id} received, but no matching business found.`);
  }
};

export const handleStripeWebhook = async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return res.status(400).send('Webhook Error: Configuration missing');
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return res.status(400).send(`Webhook Error: ${errorMessage}`);
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const { businessId, userEmail } = session.metadata || {};

      if (!businessId || !userEmail || !session.subscription) {
        console.error('Webhook received without required metadata.');
        return res.status(200).json({ received: true, error: "Missing metadata" });
      }

      const subscription = await stripe.subscriptions.retrieve(session.subscription as string);

      try {
        const existingBusiness = await AllowedBusinessModel.findOne({ emailContacto: userEmail });
        if (existingBusiness) {
          console.log(`Webhook for existing email: ${userEmail}. Updating subscription info.`);
          existingBusiness.stripeSubscriptionId = subscription.id;
          existingBusiness.subscriptionStatus = subscription.status as 'trialing' | 'active' | 'canceled' | 'paused' | 'unpaid';
          existingBusiness.periodEndDate = new Date(subscription.current_period_end * 1000);
          existingBusiness.cancelAtPeriodEnd = subscription.cancel_at_period_end;
          await existingBusiness.save();
        } else {
          const newBusiness = new AllowedBusinessModel({
            idNegocio: businessId,
            emailContacto: userEmail,
            estado: 'activo',
            stripeSubscriptionId: subscription.id,
            subscriptionStatus: subscription.status as 'trialing' | 'active' | 'canceled' | 'paused' | 'unpaid',
            periodEndDate: new Date(subscription.current_period_end * 1000),
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
          });
          await newBusiness.save();

          const defaultConfig = new BusinessConfigModel({
            idNegocio: businessId,
            nombre: businessId,
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
          await defaultConfig.save();
          await sendWelcomeEmail({ to_email: userEmail, business_id: businessId });
        }
        console.log(`✅ Business created/updated for ${businessId}.`);
      } catch (dbError) {
        console.error('Error creating/updating business:', dbError);
      }
      break;
    }
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
    case 'customer.subscription.paused':
    case 'customer.subscription.resumed':
      const subscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionChange(subscription);
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.status(200).json({ received: true });
};

export const getCheckoutSessionStatus = async (req: Request, res: Response) => {
  const { session_id } = req.query;

  if (!session_id || typeof session_id !== 'string') {
    return res.status(400).json({ error: 'Session ID is required.' });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id);
    const userEmail = session.metadata?.userEmail;

    if (session.payment_status === 'paid' && userEmail) {
      const business = await AllowedBusinessModel.findOne({ emailContacto: userEmail });
      if (business) {
        return res.json({
          status: session.status,
          payment_status: session.payment_status,
          customer_email: session.customer_details?.email,
          idNegocio: business.idNegocio
        });
      } else {
        return res.status(404).json({ error: 'Business not found, but payment was successful.' });
      }
    } else {
      return res.status(400).json({ error: 'Payment not successful or session invalid.' });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: `Stripe Error: ${errorMessage}` });
  }
};

export const getSubscriptionDetails = async (req: Request, res: Response) => {
  try {
    const idNegocio = req.idNegocio;
    if (!idNegocio) {
      return res.status(401).json({ message: 'No autorizado: ID de negocio no encontrado en el token.' });
    }

    const business = await AllowedBusinessModel.findOne({ idNegocio: idNegocio });
    if (!business) {
      return res.status(404).json({ error: 'Business not found.' });
    }

    res.json({
      idNegocio: business.idNegocio,
      emailContacto: business.emailContacto,
      stripeSubscriptionId: business.stripeSubscriptionId,
      subscriptionStatus: business.subscriptionStatus,
      periodEndDate: business.periodEndDate,
      cancelAtPeriodEnd: business.cancelAtPeriodEnd,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: `Server Error: ${errorMessage}` });
  }
};

export const cancelSubscription = async (req: Request, res: Response) => {
  try {
    const idNegocio = req.idNegocio;
    if (!idNegocio) {
      return res.status(401).json({ message: 'No autorizado: ID de negocio no encontrado en el token.' });
    }

    const business = await AllowedBusinessModel.findOne({ idNegocio: idNegocio });
    if (!business || !business.stripeSubscriptionId) {
      return res.status(404).json({ error: 'Subscription not found for this business.' });
    }

    const subscription = await stripe.subscriptions.update(business.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    await handleSubscriptionChange(subscription);

    res.json({ message: 'Subscription scheduled for cancellation at the end of the current period.' });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: `Stripe Error: ${errorMessage}` });
  }
};

export const revertSubscriptionCancellation = async (req: Request, res: Response) => {
  try {
    const idNegocio = req.idNegocio;
    if (!idNegocio) {
      return res.status(401).json({ message: 'No autorizado: ID de negocio no encontrado en el token.' });
    }

    const business = await AllowedBusinessModel.findOne({ idNegocio: idNegocio });
    if (!business || !business.stripeSubscriptionId) {
      return res.status(404).json({ error: 'Subscription not found for this business.' });
    }

    // Retrieve the subscription to check its status
    const stripeSubscription = await stripe.subscriptions.retrieve(business.stripeSubscriptionId);

    // Only revert if it's currently scheduled for cancellation
    if (stripeSubscription.cancel_at_period_end) {
      const updatedSubscription = await stripe.subscriptions.update(business.stripeSubscriptionId, {
        cancel_at_period_end: false,
      });

      // Update our database with the new status
      await handleSubscriptionChange(updatedSubscription);

      res.json({ message: 'Subscription cancellation reverted successfully.' });
    } else {
      res.status(400).json({ error: 'Subscription is not scheduled for cancellation.' });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: `Stripe Error: ${errorMessage}` });
  }
};