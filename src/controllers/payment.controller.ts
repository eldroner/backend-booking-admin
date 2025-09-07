import { Request, Response } from 'express';
import Stripe from 'stripe';

import { AllowedBusinessModel } from '../models/allowed-business.model';
import { BusinessConfigModel } from '../models/config.model';
import { sendWelcomeEmail } from '../services/email.service';

// It's a good practice to initialize Stripe with the API key from environment variables.
// The check for process.env.STRIPE_API_KEY ensures we don't crash if it's missing.
const stripe = new Stripe(process.env.STRIPE_API_KEY || '', {
  apiVersion: '2024-04-10', // Use a fixed API version
});

export const createCheckoutSession = async (req: Request, res: Response) => {
  const { businessId, userEmail } = req.body;

  // The user only needs to create one Product and Price in the Stripe Dashboard.
  const plan = {
    priceId: 'price_1S0SDxDz9N5vmn9tXiypiQNh' // Replace with your actual Price ID from Stripe
  };

  if (!businessId || !userEmail) {
    return res.status(400).json({ error: 'Invalid input: businessId and userEmail are required.' });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: plan.priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      subscription_data: {
        trial_period_days: 30,
      },
      success_url: `${process.env.FRONTEND_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/payment-cancelled`,
      // Store data to be used by the webhook upon successful payment
      metadata: {
        businessId,
        userEmail,
        planName: 'default' // You can change this to the chosen plan name
      }
    });

    res.status(200).json({ url: session.url });
  } catch (error) {
    if (error instanceof Error) {
        res.status(500).json({ error: `Stripe Error: ${error.message}` });
    } else {
        res.status(500).json({ error: 'An unknown error occurred while creating checkout session' });
    }
  }
};

export const handleStripeWebhook = async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    console.error('Stripe signature or webhook secret is missing.');
    return res.status(400).send('Webhook Error: Configuration missing');
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error(`Webhook signature verification failed: ${errorMessage}`);
    return res.status(400).send(`Webhook Error: ${errorMessage}`);
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object as Stripe.Checkout.Session;
      const { businessId, userEmail } = session.metadata || {};
      console.log(`Webhook received for businessId: ${businessId}, userEmail: ${userEmail}`);

      if (!businessId || !userEmail) {
        console.error('Webhook received without required metadata (businessId, userEmail).');
        return res.status(200).json({ received: true, error: "Missing metadata" });
      }

      try {
        // FOR DEVELOPMENT ONLY: Delete existing business and config to allow re-testing
        console.log(`Attempting to delete existing AllowedBusiness for email: ${userEmail}`);
        await AllowedBusinessModel.deleteOne({ emailContacto: userEmail });
        console.log(`Attempting to delete existing BusinessConfig for idNegocio: ${businessId}`);
        await BusinessConfigModel.deleteOne({ idNegocio: businessId });
        console.log('Existing documents deleted (if any).');

        // Check if a business with this email already exists to prevent duplicates
        const existingBusiness = await AllowedBusinessModel.findOne({ emailContacto: userEmail });
        if (existingBusiness) {
          console.log(`Webhook received for an existing email: ${userEmail}. Ignoring.`);
          break; // Exit the switch, but send 200 OK
        }

        const newBusiness = new AllowedBusinessModel({
          idNegocio: businessId,
          emailContacto: userEmail,
          estado: 'activo'
        });

        console.log('Saving new business...');
        await newBusiness.save();
        console.log('New business saved.');

        // Create default config with default services
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

        console.log(`✅ Payment successful! New business created: ${businessId} with default data.`);

      } catch (dbError) {
        console.error('Error creating business after webhook received:', dbError);
        // We don't send a 500 to Stripe, as it would cause retries.
        // This is an internal error that should be monitored.
      }

      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  // Return a 200 response to acknowledge receipt of the event
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
      // Payment was successful, find the business that was created.
      const business = await AllowedBusinessModel.findOne({ emailContacto: userEmail });
      if (business) {
        return res.json({
          status: session.status,
          payment_status: session.payment_status,
          customer_email: session.customer_details?.email,
          idNegocio: business.idNegocio
        });
      } else {
        // This can happen due to a small delay between webhook processing and this call.
        // Or if the webhook failed.
        return res.status(404).json({ error: 'Business not found, but payment was successful. Please try again shortly.' });
      }
    } else {
      return res.status(400).json({ error: 'Payment not successful or session invalid.' });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: `Stripe Error: ${errorMessage}` });
  }
};
