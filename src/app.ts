import mongoose from 'mongoose';
import 'dotenv/config'; // Necesario para variables de entorno
import express from 'express';
import cors from 'cors';
import configRoutes from './routes/api.routes';

const app = express();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/booking-manager')
  .then(() => console.log('✅ Conectado a MongoDB'))
  .catch(err => console.error('❌ Error de conexión a MongoDB:', err));

// Middlewares esenciales
app.use(express.json());
app.use(cors({
  origin: 'http://localhost:4200', // URL de Angular
  methods: ['GET', 'POST', 'PUT', 'DELETE']
}));

// Conectar rutas
app.use('/api', configRoutes);

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Servidor backend en puerto ${PORT}`);
});