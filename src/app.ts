import { startReservationCleanupJob, startRatingRequestJob } from './services/cron.service';
import mongoose from 'mongoose';
import 'dotenv/config';
import cloudinary from './config/cloudinary'; // Importar el objeto cloudinary

// Configurar Cloudinary después de que dotenv haya cargado las variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import configRoutes from './routes/api.routes';
import { Request, Response, NextFunction } from 'express';

import { handleStripeWebhook } from './controllers/payment.controller';
import { getBusinessSharePage } from './controllers/share.controller';

const app = express();

// 1. Configuración mejorada de MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/booking-manager';
const mongooseOptions = {
  connectTimeoutMS: 5000, // 5 segundos de timeout
  socketTimeoutMS: 30000, // 30 segundos para operaciones
  serverSelectionTimeoutMS: 5000, // 5 segundos para seleccionar servidor
  retryWrites: true,
  retryReads: true
};





mongoose.connect(MONGODB_URI, mongooseOptions)
  .then(() => {
    startReservationCleanupJob(); // Start the cron job
    startRatingRequestJob(); // Start the rating request job
  })
  .catch(err => {
    console.error('❌ Error de conexión a MongoDB:', err.message);
    process.exit(1); // Salir si no hay conexión a DB
  });

// 2. Middlewares mejorados


const allowedOrigins = [
  'http://localhost:4200',
  'http://127.0.0.1:4200',
  'https://reservas.pixelnova.es',
  'https://www.reservas.pixelnova.es',
  'https://bookiss.es',
  'https://www.bookiss.es'
];

app.use(cors({
  origin: function(origin, callback) {
    // Permite solicitudes sin origen (como curl o postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Origen CORS no permitido'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Stripe webhook endpoint needs the raw body
app.post('/api/payments/webhook', express.raw({type: 'application/json'}), handleStripeWebhook);

app.use(express.json({ limit: '10kb' })); // Limitar tamaño de payload

// Logger de solicitudes HTTP
app.use(morgan('dev'));

/** HTML con metadatos Open Graph (Nginx reenvía aquí el tráfico de crawlers sociales). */
app.get('/__share/:slug', getBusinessSharePage);

// 3. Middleware de timeout global
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setTimeout(8000, () => { // 8 segundos
    console.error(`⌛ Timeout en ruta: ${req.method} ${req.url}`);
    res.status(504).json({ 
      error: 'El servidor tardó demasiado en responder' 
    });
  });
  next();
});

// 5. Conectar rutas principales
app.use('/api', configRoutes);

// 4. Health Check Endpoint (Moved after /api to be consistent or just use /api/health)
app.get('/api/health', (req: Request, res: Response) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({ 
    status: 'OK',
    database: dbStatus,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// 6. Ruta para 404
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({ 
    error: 'Ruta no encontrada',
    attemptedPath: req.originalUrl 
  });
});

// 7. Manejador de errores global (debe ir al final)
app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
  const m = err as { name?: string; code?: string; message?: string };
  if (m?.name === 'MulterError') {
    if (m.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        error: 'La imagen supera el tamaño máximo permitido (10 MB). Prueba con otra más pequeña o comprímela.'
      });
    }
    return res.status(400).json({ error: m.message || 'Error al subir el archivo' });
  }

  const e = err instanceof Error ? err : new Error(String(err));
  console.error('🔥 Error global:', {
    error: e.message,
    stack: process.env.NODE_ENV === 'production' ? undefined : e.stack,
    path: req.path,
    method: req.method
  });

  res.status(500).json({
    error: 'Error interno del servidor',
    ...(process.env.NODE_ENV !== 'production' && { details: e.message })
  });
});

// 8. Configuración del servidor
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
});

// 9. Manejo de cierre adecuado
process.on('SIGTERM', () => {
  server.close(() => {
    mongoose.disconnect();
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  server.close(() => {
    mongoose.disconnect();
    process.exit(0);
  });
});