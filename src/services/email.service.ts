import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// SMTP Configuration
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SENDER_EMAIL = process.env.SENDER_EMAIL;

// --- INTERFACES ---
interface CancellationEmailData {
  user_name: string;
  to_email: string;
  booking_date: string;
  booking_time: string;
  service_name: string;
  business_name: string;
  business_id?: string;
}

interface WelcomeEmailData {
  to_email: string;
  business_id: string;
}

interface PasswordChangedEmailData {
    to_email: string;
    business_name: string;
}

interface EmailChangedEmailData {
    to_email: string;
    business_name: string;
    new_email: string;
}

interface BookingConfirmationEmailData {
  to_email: string;
  user_name: string;
  verification_link: string;
  cancellation_link: string;
  business_name: string;
  service_name: string;
  booking_date: string;
  booking_time: string;
}

interface AdminNotificationEmailData {
  to_email: string;
  user_name: string;
  business_name: string;
  service_name: string;
  booking_date: string;
  booking_time: string;
}


// --- TRANSPORTER ---
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});


// --- TEMPLATE WRAPPER ---
const emailWrapper = (title: string, content: string): string => {
  return `
  <div style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
    <div style="max-width: 600px; margin: auto; background-color: #ffffff; border-top: 5px solid #8B1C20; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
      
      <div style="padding: 30px 30px 20px 30px; text-align: center;">
        <a href="https://pixelnova.es/" target="_blank" rel="noopener">
          <img src="https://raw.githubusercontent.com/eldroner/mis-assets/main/pixelnova-logo-gris-rojo-sin-fondo.png" alt="Logo Pixelnova" style="max-height: 45px; opacity: 0.9;">
        </a>
      </div>

      <div style="padding: 0 30px 30px 30px;">
        <h2 style="color: #8B1C20; text-align: center; font-size: 24px; margin-bottom: 20px;">${title}</h2>
        
        <div style="color: #555555; line-height: 1.6;">
          ${content}
        </div>
        
        <div style="border-top: 1px solid #eeeeee; margin: 30px 0;"></div>

        <p style="font-size: 11px; color: #888888; text-align: center; line-height: 1.5;">
          Este mensaje ha sido enviado por Pixelnova Digital Services.<br>
          Dirección: Calle de Andalucía 9 · Email: <a href="mailto:info@pixelnova.es" style="color: #888888;">info@pixelnova.es</a> · 
          Tel: <a href="https://wa.me/34633703882" style="color: #888888; text-decoration: none;">633703882</a><br>
          Los datos personales serán tratados conforme al RGPD y la LOPDGDD. Más información en nuestra
          <a href="https://pixelnova.es/privacy-policy" style="color: #BE5B5D; text-decoration: none;">política de privacidad</a>.
        </p>
      </div>

    </div>
  </div>
  `;
};


// --- EMAIL FUNCTIONS ---

export const sendCancellationEmail = async (data: CancellationEmailData) => {
  const title = "Cancelación de Cita";
  const content = `
    <p>Hola <strong>${data.user_name}</strong>,</p>
    <p>Lamentamos informarte que tu reserva para el servicio <strong>${data.service_name}</strong> ha sido cancelada debido a que no fue verificada en el tiempo establecido.</p>
    <p>La cita estaba programada para el <strong>${data.booking_date}</strong> a las <strong>${data.booking_time}</strong>.</p>
    <p>Si todavía deseas el servicio, puedes crear una nueva reserva:</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://reservas.pixelnova.es/${data.business_id}" style="background-color: #CF0D0E; color: white; text-decoration: none; padding: 12px 25px; border-radius: 5px; font-weight: bold;">
        Crear Nueva Reserva
      </a>
    </div>
    <p style="margin-top: 20px;">Saludos cordiales,<br>El equipo de <strong>${data.business_name}</strong></p>
  `;

  const mailOptions = {
    from: `"Reservas Pixelnova" <${SENDER_EMAIL}>`,
    to: data.to_email,
    subject: `Reserva cancelada en ${data.business_name}`,
    html: emailWrapper(title, content),
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Error al enviar email de cancelación con Nodemailer:', error);
    throw error;
  }
};

export const sendWelcomeEmail = async (data: WelcomeEmailData) => {
  const adminUrl = `https://reservas.pixelnova.es/${data.business_id}/admin`;
  const publicUrl = `https://reservas.pixelnova.es/${data.business_id}`;

  const title = "¡Bienvenido a tu Sistema de Reservas!";
  const content = `
    <p>¡Gracias por registrarte! Tu espacio de reservas ya está casi listo.</p>
    <p>Accede a tu panel de administración para terminar la configuración:</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${adminUrl}" style="background-color: #CF0D0E; color: white; text-decoration: none; padding: 12px 25px; border-radius: 5px; font-weight: bold;">
        Acceder a mi Panel de Admin
      </a>
    </div>
    <p>La URL para que tus clientes reserven es: <a href="${publicUrl}" style="color: #BE5B5D; text-decoration: none;">${publicUrl}</a></p>
    <p><strong>Primeros pasos recomendados:</strong></p>
    <ol style="padding-left: 20px;">
      <li>Accede a tu panel de administración.</li>
      <li>Establece tu horario de trabajo.</li>
      <li>Configura los servicios que ofreces.</li>
      <li>¡Comparte tu enlace de reservas!</li>
    </ol>
    <p style="margin-top: 20px;">Saludos cordiales,<br>El equipo de <strong>Pixelnova</strong></p>
  `;

  const mailOptions = {
    from: `"Reservas Pixelnova" <${SENDER_EMAIL}>`,
    to: data.to_email,
    subject: '¡Bienvenido! Comienza a gestionar tus reservas',
    html: emailWrapper(title, content),
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Error al enviar email de bienvenida con Nodemailer:', error);
    throw error;
  }
};

export const sendPasswordChangedEmail = async (data: PasswordChangedEmailData) => {
  const title = "Notificación de Seguridad";
  const content = `
    <p>Hola,</p>
    <p>Te informamos que la contraseña de tu cuenta para el negocio <strong>${data.business_name}</strong> ha sido actualizada recientemente.</p>
    <p>Si no has sido tú quien ha realizado este cambio, por favor, contacta con nuestro equipo de soporte inmediatamente.</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="mailto:info@pixelnova.es" style="background-color: #CF0D0E; color: white; text-decoration: none; padding: 12px 25px; border-radius: 5px; font-weight: bold;">
        Contactar a Soporte
      </a>
    </div>
    <p style="margin-top: 20px;">Saludos cordiales,<br>El equipo de <strong>Pixelnova</strong></p>
  `;

  const mailOptions = {
    from: `"Reservas Pixelnova" <${SENDER_EMAIL}>`,
    to: data.to_email,
    subject: `Notificación de seguridad: Contraseña actualizada para ${data.business_name}`,
    html: emailWrapper(title, content),
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Error al enviar email de cambio de contraseña:', error);
    throw error;
  }
};

export const sendEmailChangedEmail = async (data: EmailChangedEmailData) => {
  const title = "Notificación de Seguridad";
  const content = `
    <p>Hola,</p>
    <p>Te informamos que el email de contacto para tu negocio <strong>${data.business_name}</strong> ha sido cambiado a <strong>${data.new_email}</strong>.</p>
    <p>A partir de ahora, todas las notificaciones se enviarán a esta nueva dirección.</p>
    <p>Si no has sido tú quien ha realizado este cambio, por favor, contacta con nuestro equipo de soporte inmediatamente.</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="mailto:info@pixelnova.es" style="background-color: #CF0D0E; color: white; text-decoration: none; padding: 12px 25px; border-radius: 5px; font-weight: bold;">
        Contactar a Soporte
      </a>
    </div>
    <p style="margin-top: 20px;">Saludos cordiales,<br>El equipo de <strong>Pixelnova</strong></p>
  `;

  const mailOptions = {
    from: `"Reservas Pixelnova" <${SENDER_EMAIL}>`,
    to: data.to_email,
    subject: `Notificación de seguridad: Email actualizado para ${data.business_name}`,
    html: emailWrapper(title, content),
  };

  try {
    // Send to the old email address
    await transporter.sendMail(mailOptions);
    // Also send a notification to the new email address
    const newEmailOptions = { ...mailOptions, to: data.new_email };
    await transporter.sendMail(newEmailOptions);
  } catch (error) {
    console.error('Error al enviar email de cambio de email:', error);
    throw error;
  }
};

export const sendBookingConfirmationEmail = async (data: BookingConfirmationEmailData) => {
  const title = "¡Confirma tu Reserva!";
  const content = `
    <p>Hola <strong>${data.user_name}</strong>,</p>
    <p>Gracias por solicitar una reserva en <strong>${data.business_name}</strong>. Por favor, confirma tu cita para el servicio:</p>
    <p style="font-size: 18px; font-weight: bold; color: #333; text-align: center; margin: 20px 0;">${data.service_name}</p>
    <p style="text-align: center;">El <strong>${data.booking_date}</strong> a las <strong>${data.booking_time}</strong></p>
    <p>Para asegurar tu plaza, haz clic en el siguiente botón:</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${data.verification_link}" style="background-color: #CF0D0E; color: white; text-decoration: none; padding: 12px 25px; border-radius: 5px; font-weight: bold;">
        Confirmar mi Reserva
      </a>
    </div>
    <p>Si no confirmas la reserva, esta se cancelará automáticamente. Si deseas cancelar, puedes hacerlo aquí: <a href="${data.cancellation_link}" style="color: #BE5B5D;">Cancelar</a>.</p>
    <p style="margin-top: 20px;">Saludos cordiales,<br>El equipo de <strong>${data.business_name}</strong></p>
  `;

  const mailOptions = {
    from: `"Reservas Pixelnova" <${SENDER_EMAIL}>`,
    to: data.to_email,
    subject: `Confirma tu reserva en ${data.business_name}`,
    html: emailWrapper(title, content),
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Error al enviar email de confirmación de reserva con Nodemailer:', error);
    throw error;
  }
};

export const sendAdminNotificationEmail = async (data: AdminNotificationEmailData) => {
  const title = "Nueva Solicitud de Reserva";
  const content = `
    <p>Hola,</p>
    <p>Has recibido una nueva solicitud de reserva en <strong>${data.business_name}</strong>.</p>
    <div style="border-top: 1px solid #eeeeee; margin: 20px 0;"></div>
    <p><strong>Detalles de la reserva:</strong></p>
    <ul style="list-style-type: none; padding-left: 0;">
      <li style="padding-bottom: 10px;"><strong>Cliente:</strong> ${data.user_name}</li>
      <li style="padding-bottom: 10px;"><strong>Servicio:</strong> ${data.service_name}</li>
      <li style="padding-bottom: 10px;"><strong>Fecha:</strong> ${data.booking_date}</li>
      <li style="padding-bottom: 10px;"><strong>Hora:</strong> ${data.booking_time}</li>
    </ul>
    <div style="border-top: 1px solid #eeeeee; margin: 20px 0;"></div>
    <p>La reserva está pendiente de la confirmación del cliente.</p>
    <p style="margin-top: 20px;">Saludos cordiales,<br>Tu sistema de reservas de <strong>Pixelnova</strong></p>
  `;

  const mailOptions = {
    from: `"Reservas Pixelnova" <${SENDER_EMAIL}>`,
    to: data.to_email,
    subject: `Nueva solicitud de reserva de ${data.user_name}`,
    html: emailWrapper(title, content),
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Error al enviar email de notificación a admin con Nodemailer:', error);
    throw error;
  }
};