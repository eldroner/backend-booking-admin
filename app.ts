// backend/app.ts
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRoutes from './routes/api.routes';

dotenv.config(); // Carga variables de entorno

const app = express();

// Middlewares
app.use(cors()); // Permite peticiones desde Angular
app.use(express.json()); // Para parsear JSON

// Conexión a MongoDB
// Conexión optimizada para Atlas
mongoose.connect(process.env.MONGODB_URI!, {
    retryWrites: true,
    w: 'majority',
    dbName: 'booking-manager'
  })
  .then(() => console.log('✅ Conectado a MongoDB Atlas'))
  .catch(err => console.error('❌ Error de conexión:', err.message));

// Rutas
app.use('/api', apiRoutes);

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor en http://localhost:${PORT}`);
});

console.log("URI:", process.env.MONGODB_URI?.replace(/\/\/.*@/, '//xjrapx:PqJZpKkKW2ATEMcm@'));