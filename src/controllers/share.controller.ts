import { Request, Response } from 'express';
import { BusinessConfigModel } from '../models/config.model';
import { AllowedBusinessModel } from '../models/allowed-business.model';

export const getBusinessSharePage = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const reservedSlugs = ['admin', 'business-signup', 'super-admin', 'api', 'confirmar', 'valorar', 'cancelar-reserva', 'payment-success', 'terminos-de-suscripcion'];

    if (reservedSlugs.includes(slug)) {
      return res.status(404).send('Not Found');
    }

    // 1. Verificar si el negocio existe
    const allowed = await AllowedBusinessModel.findOne({ idNegocio: slug });
    if (!allowed) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
          <head><meta http-equiv="refresh" content="0; url=/"></head>
          <body>Negocio no encontrado. Redirigiendo...</body>
        </html>
      `);
    }

    // 2. Cargar configuración para los metas
    const config = await BusinessConfigModel.findOne({ idNegocio: slug });
    
    const frontendUrl = process.env.FRONTEND_URL || `${req.protocol}://${req.get('host')}`;
    const nombre = config?.nombre || slug;
    const description = config?.slogan || config?.descripcion || 'Reserva tu cita online de forma fácil y rápida.';
    
    // Imagen: 1. Foto negocio, 2. Logo custom, 3. Default
    let imageUrl = process.env.DEFAULT_OG_IMAGE || 'https://raw.githubusercontent.com/eldroner/mis-assets/main/pixelnova-logo-gris-rojo.png';
    if (config?.fotoUrls && config.fotoUrls.length > 0) {
      imageUrl = config.fotoUrls[0];
    } else if (config?.googleCustomLogo) {
      imageUrl = config.googleCustomLogo;
    }

    const canonicalUrl = `${frontendUrl}/${slug}`;

    // 3. Responder con el HTML mínimo para bots
    res.send(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <title>Reserva tu cita en ${nombre}</title>
        <meta name="description" content="${description}">
        <link rel="canonical" href="${canonicalUrl}">
        
        <!-- Open Graph -->
        <meta property="og:type" content="website">
        <meta property="og:url" content="${canonicalUrl}">
        <meta property="og:title" content="Reserva tu cita en ${nombre}">
        <meta property="og:description" content="${description}">
        <meta property="og:image" content="${imageUrl}">
        
        <!-- Twitter -->
        <meta name="twitter:card" content="summary_large_image">
        <meta name="twitter:url" content="${canonicalUrl}">
        <meta name="twitter:title" content="Reserva tu cita en ${nombre}">
        <meta name="twitter:description" content="${description}">
        <meta name="twitter:image" content="${imageUrl}">

        <!-- Redirección para humanos -->
        <meta http-equiv="refresh" content="0; url=/${slug}">
      </head>
      <body>
        <h1>${nombre}</h1>
        <p>${description}</p>
        <p>Redirigiendo al sistema de reservas...</p>
      </body>
      </html>
    `);

  } catch (error) {
    console.error('Error in share controller:', error);
    res.status(500).send('Internal Server Error');
  }
};
