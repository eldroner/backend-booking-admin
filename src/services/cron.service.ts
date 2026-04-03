import cron from 'node-cron';
import { ReservaModel } from '../models/reserva.model';
import { BusinessConfigModel } from '../models/config.model';
import { StaffModel } from '../models/staff.model';
import { sendCancellationEmail, sendRatingRequestEmail, sendBookingReminderEmail } from './email.service';

const MS_HOUR = 60 * 60 * 1000;

function publicBaseUrl(): string {
  return (process.env.FRONTEND_URL || 'https://bookiss.es').replace(/\/$/, '');
}

/** YYYY-MM-DD en la zona indicada (p. ej. día civil en España). */
function dateKeyInTimeZone(d: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

function reminderTimeZone(): string {
  return (process.env.REMINDER_TIMEZONE || 'Europe/Madrid').trim() || 'Europe/Madrid';
}

function reminderSendHour(): number {
  const h = parseInt(process.env.REMINDER_SEND_HOUR || '7', 10);
  return Number.isFinite(h) && h >= 0 && h <= 23 ? h : 7;
}

function reminderSendMinute(): number {
  const m = parseInt(process.env.REMINDER_SEND_MINUTE || '0', 10);
  return Number.isFinite(m) && m >= 0 && m <= 59 ? m : 0;
}

/** Antelación mínima entre creación de la reserva e inicio de la cita para enviar recordatorio (horas). */
function reminderMinAdvanceHours(): number {
  const n = parseInt(process.env.REMINDER_MIN_ADVANCE_HOURS || '24', 10);
  return Number.isFinite(n) && n >= 0 && n <= 168 ? n : 24;
}

export const startReservationCleanupJob = () => {
  cron.schedule('* * * * *', async () => { // Runs every minute
    const now = new Date();

    try {
      const expiredReservations = await ReservaModel.find({
        estado: 'pendiente_email',
        expiresAt: { $lt: now },
      });

      for (const reserva of expiredReservations) {
        // Update reservation status to cancelled
        reserva.estado = 'cancelada';
        await reserva.save();

        // Get business name for email
        let businessName = 'Tu Negocio'; // Default name
        let serviceNameForEmail = reserva.servicio; // Default to service ID

        let businessConfig = null;
        if (reserva.idNegocio) {
          businessConfig = await BusinessConfigModel.findOne({ idNegocio: reserva.idNegocio });
          if (businessConfig) {
            businessName = businessConfig.nombre;
            const foundService = businessConfig.servicios.find(s => s.id === reserva.servicio);
            if (foundService) {
              serviceNameForEmail = foundService.nombre;
            }
          }
        }

        // Send cancellation email
        try {
          await sendCancellationEmail({
            user_name: reserva.usuario.nombre,
            to_email: reserva.usuario.email,
            booking_date: reserva.fechaInicio.toLocaleDateString('es-ES'),
            booking_time: reserva.fechaInicio.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
            service_name: serviceNameForEmail,
            business_name: businessName,
            business_id: reserva.idNegocio,
          });
        } catch (emailError) {
          console.error(`Failed to send cancellation email for reservation ${reserva._id}:`, emailError);
        }
      }
    } catch (error) {
      console.error('Error in reservation cleanup job:', error);
    }
  });
};

/**
 * Recordatorio por email el **mismo día** de la cita, a primera hora (por defecto 7:00 en REMINDER_TIMEZONE).
 * Solo reservas `origen: web` y solo si entre `createdAt` y `fechaInicio` hay al menos REMINDER_MIN_ADVANCE_HOURS (24 por defecto):
 * así no se envía si la cita se cogió el mismo día con poca antelación (mañana → tarde).
 * No envía si la cita ya pasó o es demasiado pronto respecto al momento del envío.
 *
 * Env: REMINDER_TIMEZONE (Europe/Madrid), REMINDER_SEND_HOUR, REMINDER_SEND_MINUTE, REMINDER_MIN_ADVANCE_HOURS.
 */
export const startBookingReminderJob = () => {
  const tz = reminderTimeZone();
  const h = reminderSendHour();
  const min = reminderSendMinute();
  const cronExpr = `${min} ${h} * * *`;

  cron.schedule(
    cronExpr,
    async () => {
    const now = new Date();
    const todayKey = dateKeyInTimeZone(now, tz);
    const minAdvanceMs = reminderMinAdvanceHours() * MS_HOUR;
    const base = publicBaseUrl();

    /** Rango amplio en UTC y filtro fino por día civil en `tz`. */
    const queryFrom = new Date(now.getTime() - 36 * MS_HOUR);
    const queryTo = new Date(now.getTime() + 48 * MS_HOUR);

    try {
      const reservas = await ReservaModel.find({
        estado: 'confirmada',
        origen: 'web',
        reminderEmailSent: { $ne: true },
        fechaInicio: { $gte: queryFrom, $lte: queryTo },
        cancellation_token: { $exists: true, $nin: [null, ''] },
      });

      for (const reserva of reservas) {
        const email = reserva.usuario?.email?.trim();
        if (!email) continue;

        if (dateKeyInTimeZone(reserva.fechaInicio, tz) !== todayKey) continue;

        const startMs = reserva.fechaInicio.getTime();
        if (startMs <= now.getTime() + 15 * 60 * 1000) continue;

        const createdAt = reserva.createdAt?.getTime();
        if (createdAt == null || !Number.isFinite(createdAt)) continue;
        if (startMs - createdAt < minAdvanceMs) continue;

        let businessName = 'Tu Negocio';
        let serviceNameForEmail = reserva.servicio;
        let servicePrice: number | undefined;

        if (reserva.idNegocio) {
          const businessConfig = await BusinessConfigModel.findOne({ idNegocio: reserva.idNegocio });
          if (businessConfig) {
            businessName = businessConfig.nombre;
            const foundService = businessConfig.servicios.find(
              s => String(s.id) === String(reserva.servicio) || s.nombre === reserva.servicio
            );
            if (foundService) {
              serviceNameForEmail = foundService.nombre;
              servicePrice =
                foundService.enOferta && foundService.precioOferta != null
                  ? foundService.precioOferta
                  : foundService.precio;
            }
          }
        }

        const token = reserva.cancellation_token;
        if (!token) continue;
        const cancellationLink = `${base}/cancelar-reserva?token=${encodeURIComponent(token)}`;
        const publicBookingUrl = reserva.idNegocio ? `${base}/${encodeURIComponent(reserva.idNegocio)}` : base;

        try {
          await sendBookingReminderEmail({
            to_email: email,
            user_name: reserva.usuario.nombre,
            business_name: businessName,
            service_name: serviceNameForEmail,
            service_price: reserva.precioFinal ?? servicePrice,
            booking_date: reserva.fechaInicio.toLocaleDateString('es-ES'),
            booking_time: reserva.fechaInicio.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
            cancellation_link: cancellationLink,
            public_booking_url: publicBookingUrl,
          });

          reserva.reminderEmailSent = true;
          await reserva.save();
          console.log(`Reminder email sent for reservation ${reserva._id}`);
        } catch (e) {
          console.error(`Failed to send reminder for reservation ${reserva._id}:`, e);
        }
      }
    } catch (error) {
      console.error('Error in booking reminder job:', error);
    }
    },
    { timezone: tz }
  );
};

export const startRatingRequestJob = () => {
  cron.schedule('*/30 * * * *', async () => { // Cada 30 minutos
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);

    try {
      const finishedReservations = await ReservaModel.find({
        estado: 'confirmada',
        ratingRequestSent: { $ne: true },
        staffId: { $exists: true, $ne: null },
        fechaInicio: { $lt: oneHourAgo, $gt: threeHoursAgo }
      });

      for (const reserva of finishedReservations) {
        const staff = await StaffModel.findById(reserva.staffId);
        const config = await BusinessConfigModel.findOne({ idNegocio: reserva.idNegocio });

        if (staff && config) {
          const ratingLink = `https://bookiss.es/valorar/${reserva.ratingToken}`;

          try {
            await sendRatingRequestEmail({
              to_email: reserva.usuario.email,
              user_name: reserva.usuario.nombre,
              staff_name: staff.nombre,
              business_name: config.nombre,
              rating_link: ratingLink
            });

            reserva.ratingRequestSent = true;
            await reserva.save();
            console.log(`Rating request sent for reservation ${reserva._id}`);
          } catch (error) {
            console.error(`Error sending rating request for reservation ${reserva._id}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('Error in rating request job:', error);
    }
  });
};