import { startReservationCleanupJob } from './services/cron.service';
import mongoose from 'mongoose';
import 'dotenv/config';
import cloudinary from './config/cloudinary'; // Importar el objeto cloudinary

// Configurar Cloudinary después de que dotenv haya cargado las variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

console.log('CLOUDINARY_API_KEY en app.ts:', process.env.CLOUDINARY_API_KEY);
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import configRoutes from './routes/api.routes';
import { Request, Response, NextFunction } from 'express';

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
    console.log('✅ Conectado a MongoDB');
    startReservationCleanupJob(); // Start the cron job
  })
  .catch(err => {
    console.error('❌ Error de conexión a MongoDB:', err.message);
    process.exit(1); // Salir si no hay conexión a DB
  });

// 2. Middlewares mejorados


const allowedOrigins = [
  'http://localhost:4200',
  'http://127.0.0.1:4200',
  'https://reservas.pixelnova.es'  // Añadido tu dominio real aquí
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

app.use(express.json({ limit: '10kb' })); // Limitar tamaño de payload

// Logger de solicitudes HTTP
app.use(morgan('dev'));

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

// 4. Health Check Endpoint
app.get('/health', (req: Request, res: Response) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({ 
    status: 'OK',
    database: dbStatus,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// 5. Conectar rutas principales
app.use('/api', configRoutes);

// 6. Manejador de errores global
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('🔥 Error global:', {
    error: err.message,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
    path: req.path,
    method: req.method
  });
  
  res.status(500).json({ 
    error: 'Error interno del servidor',
    ...(process.env.NODE_ENV !== 'production' && { details: err.message })
  });
});

// 7. Ruta para 404
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({ 
    error: 'Ruta no encontrada',
    attemptedPath: req.originalUrl 
  });
});

// 8. Configuración del servidor
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`✅ Servidor backend en puerto ${PORT}`);
});

// 9. Manejo de cierre adecuado
process.on('SIGTERM', () => {
  console.log('🛑 Recibido SIGTERM. Cerrando servidor...');
  server.close(() => {
    mongoose.disconnect();
    console.log('Servidor cerrado correctamente');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 Recibido SIGINT. Cerrando servidor...');
  server.close(() => {
    mongoose.disconnect();
    console.log('Servidor cerrado correctamente');
    process.exit(0);
  });
});
