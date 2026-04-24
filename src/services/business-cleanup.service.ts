import Stripe from 'stripe';
import { AllowedBusinessModel } from '../models/allowed-business.model';
import { BusinessConfigModel } from '../models/config.model';
import { ReservaModel } from '../models/reserva.model';
import { StaffModel } from '../models/staff.model';
import Bloqueo from '../models/bloqueo.model';
import { RatingModel } from '../models/rating.model';
import Servicio from '../models/servicios.model';

const stripe = new Stripe(process.env.STRIPE_API_KEY || '', {
  apiVersion: '2024-04-10',
});

/**
 * Elimina todos los datos locales del negocio. Opcionalmente cancela la suscripción en Stripe.
 * Usado tras expirar el periodo de gracia por impago.
 */
export async function purgeBusinessData(idNegocio: string): Promise<void> {
  const business = await AllowedBusinessModel.findOne({ idNegocio });
  if (!business) {
    return;
  }

  if (business.stripeSubscriptionId && process.env.STRIPE_API_KEY) {
    try {
      await stripe.subscriptions.cancel(business.stripeSubscriptionId);
    } catch (e) {
      console.warn(`[purge] No se pudo cancelar suscripción Stripe ${business.stripeSubscriptionId}:`, e);
    }
  }

  const reservaIds = (await ReservaModel.find({ idNegocio }).select('_id').lean()).map(r => String(r._id));
  if (reservaIds.length > 0) {
    await RatingModel.deleteMany({ reservaId: { $in: reservaIds } });
  }

  await ReservaModel.deleteMany({ idNegocio });
  await StaffModel.deleteMany({ idNegocio });
  await Bloqueo.deleteMany({ idNegocio });
  await Servicio.deleteMany({ idNegocio });
  await BusinessConfigModel.deleteOne({ idNegocio });
  await AllowedBusinessModel.deleteOne({ idNegocio });

  console.log(`[purge] Negocio ${idNegocio} y datos asociados eliminados.`);
}
