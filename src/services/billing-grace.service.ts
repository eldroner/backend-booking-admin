import { IAllowedBusiness } from '../models/allowed-business.model';
import { BusinessConfigModel } from '../models/config.model';
import { sendPaymentFailureGraceEmail } from './email.service';

function graceDays(): number {
  const n = parseInt(process.env.BILLING_GRACE_DAYS || '30', 10);
  return Number.isFinite(n) && n >= 1 && n <= 90 ? n : 30;
}

function publicBaseUrl(): string {
  return (process.env.FRONTEND_URL || 'https://bookiss.es').replace(/\/$/, '');
}

/**
 * Ajusta periodo de gracia y envía email ante impago (idempotente dentro del mismo periodo).
 */
export async function applyBillingGraceForDelinquentStatus(business: IAllowedBusiness): Promise<void> {
  const now = new Date();
  const needsNewWindow =
    !business.billingGraceEndsAt || business.billingGraceEndsAt.getTime() < now.getTime();

  if (needsNewWindow) {
    const end = new Date();
    end.setDate(end.getDate() + graceDays());
    business.billingGraceEndsAt = end;
    business.billingFailureEmailSentAt = undefined;
  }

  if (!business.billingFailureEmailSentAt) {
    const adminUrl = `${publicBaseUrl()}/admin-login`;
    const deadline = business.billingGraceEndsAt
      ? business.billingGraceEndsAt.toLocaleDateString('es-ES', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      : '';
    const config = await BusinessConfigModel.findOne({ idNegocio: business.idNegocio }).select('nombre').lean();
    const displayName = (config?.nombre && String(config.nombre).trim()) || business.idNegocio;
    await sendPaymentFailureGraceEmail({
      to_email: business.emailContacto,
      business_name: displayName,
      id_negocio: business.idNegocio,
      grace_deadline: deadline,
      admin_url: adminUrl,
    });
    business.billingFailureEmailSentAt = now;
  }
}

export function clearBillingGraceIfRecovered(business: IAllowedBusiness, stripeStatus: string): void {
  if (stripeStatus === 'active' || stripeStatus === 'trialing') {
    business.billingGraceEndsAt = undefined;
    business.billingFailureEmailSentAt = undefined;
  }
}

export const DELINQUENT_STATUSES = ['past_due', 'unpaid'] as const;

export function isDelinquentStripeStatus(status: string): boolean {
  return (DELINQUENT_STATUSES as readonly string[]).includes(status);
}
