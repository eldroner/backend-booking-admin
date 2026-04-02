"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHolidays = exports.checkDisponibilidad = exports.getStatistics = exports.updateReserva = exports.cancelarReservaPorToken = exports.cancelarReserva = exports.deleteReserva = exports.confirmarReserva = exports.getReservas = exports.confirmarReservaAdmin = exports.confirmarReservaDefinitiva = exports.addReservaAdmin = exports.createReserva = void 0;
const reserva_model_1 = require("../models/reserva.model");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const uuid_1 = require("uuid");
const config_model_1 = require("../models/config.model");
const allowed_business_model_1 = require("../models/allowed-business.model");
const crypto_1 = __importDefault(require("crypto"));
const holiday_service_1 = require("../services/holiday.service");
const staff_model_1 = require("../models/staff.model");
async function resolveStaffNombre(staffId, idNegocio) {
    if (!staffId)
        return undefined;
    const doc = await staff_model_1.StaffModel.findOne({ _id: staffId, idNegocio }).select('nombre').lean();
    return doc?.nombre != null ? String(doc.nombre).trim() || undefined : undefined;
}
/**
 * Reservas sin profesional concreto: cupo = nº de profesionales activos que pueden hacer el servicio
 * (serviciosIds vacío = todos). Si no hay staff en BD, se usa maxReservasPorSlot (comportamiento legacy).
 */
async function poolCapacitySinProfesionalAsignado(idNegocio, maxReservasPorSlot, servicioId) {
    const filter = { idNegocio, activo: true };
    if (servicioId) {
        filter.$or = [
            { serviciosIds: { $exists: false } },
            { serviciosIds: { $size: 0 } },
            { serviciosIds: servicioId }
        ];
    }
    const n = await staff_model_1.StaffModel.countDocuments(filter);
    if (n > 0) {
        return n;
    }
    return Math.max(1, maxReservasPorSlot || 1);
}
/** Reservas activas que solapan [fechaInicio, fechaInicio + duración). Misma lógica en /disponibilidad y al crear reserva. */
async function countReservasSolapadas(idNegocio, fechaInicio, duracionMinutos, staffFilter) {
    const fechaFin = new Date(fechaInicio.getTime() + duracionMinutos * 60000);
    const query = {
        idNegocio,
        estado: { $in: ['confirmada', 'pendiente_email'] },
        $or: [
            { fechaInicio: { $lt: fechaFin }, fechaFin: { $gt: fechaInicio } },
            {
                fechaInicio: { $lt: fechaFin },
                fechaFin: { $exists: false },
                $expr: {
                    $gt: [
                        { $add: ['$fechaInicio', { $multiply: [{ $ifNull: ['$duracion', 30] }, 60000] }] },
                        fechaInicio
                    ]
                }
            }
        ]
    };
    if (staffFilter) {
        query.staffId = staffFilter;
    }
    return reserva_model_1.ReservaModel.countDocuments(query);
}
const createReserva = async (req, res) => {
    try {
        const { idNegocio, ...reservaBody } = req.body;
        // Validación de campos requeridos
        const requiredFields = ['usuario', 'fechaInicio', 'servicio'];
        const missingFields = requiredFields.filter(field => !reservaBody[field]);
        if (missingFields.length > 0) {
            return res.status(400).json({
                error: "Datos incompletos",
                detalles: `Faltan los siguientes campos: ${missingFields.join(', ')}`
            });
        }
        // Validación de usuario
        if (!reservaBody.usuario.nombre?.trim() || !reservaBody.usuario.email?.trim()) {
            return res.status(400).json({
                error: "Datos de usuario incompletos",
                detalles: "Nombre y email son requeridos"
            });
        }
        // Validación de fechas
        const fechaInicio = new Date(reservaBody.fechaInicio);
        if (isNaN(fechaInicio.getTime())) {
            return res.status(400).json({
                error: "Fecha inválida",
                detalles: "La fecha de inicio no es válida"
            });
        }
        // Validación de antelación mínima
        const config = await config_model_1.BusinessConfigModel.findOne({ idNegocio });
        if (config && config.antelacionMinimaHoras && config.antelacionMinimaHoras > 0) {
            const minDate = new Date();
            minDate.setHours(minDate.getHours() + config.antelacionMinimaHoras);
            if (fechaInicio < minDate) {
                return res.status(400).json({
                    error: "Antelación insuficiente",
                    detalles: `Debe reservar con al menos ${config.antelacionMinimaHoras} horas de antelación.`
                });
            }
        }
        if (!idNegocio) {
            return res.status(400).json({ error: 'idNegocio es requerido' });
        }
        const duracionMin = reservaBody.duracion || 30;
        const solapes = await countReservasSolapadas(idNegocio, fechaInicio, duracionMin, reservaBody.staffId);
        if (reservaBody.staffId) {
            if (solapes > 0) {
                return res.status(409).json({
                    error: 'Ese profesional no está disponible en el horario elegido.',
                    detalles: 'Ya existe una reserva solapada para este miembro del equipo.'
                });
            }
        }
        else {
            const poolCap = await poolCapacitySinProfesionalAsignado(idNegocio, config?.maxReservasPorSlot ?? 1, reservaBody.servicio);
            if (solapes >= poolCap) {
                return res.status(409).json({
                    error: 'No hay huecos libres para ese horario.',
                    detalles: 'El cupo de reservas para esta franja está completo.'
                });
            }
        }
        if (!process.env.JWT_SECRET) {
            throw new Error("JWT_SECRET no está configurado en las variables de entorno");
        }
        const confirmacionToken = jsonwebtoken_1.default.sign({
            email: reservaBody.usuario.email,
            fecha: fechaInicio.toISOString(),
            servicio: reservaBody.servicio
        }, process.env.JWT_SECRET, { expiresIn: '4h' });
        if (!confirmacionToken) {
            throw new Error("Error al generar el token de confirmación");
        }
        const cancellationToken = crypto_1.default.randomBytes(32).toString('hex');
        const ratingToken = crypto_1.default.randomBytes(32).toString('hex'); // Token para valoración
        // Obtener el email de contacto del negocio
        const negocioPermitido = await allowed_business_model_1.AllowedBusinessModel.findOne({ idNegocio: idNegocio });
        if (!negocioPermitido) {
            return res.status(404).json({ error: 'Negocio no encontrado o no autorizado' });
        }
        // Obtener precio base del servicio
        let precioBase = 0;
        if (config) {
            // Buscar el servicio por ID o por Nombre (comparando como strings para evitar fallos de ObjectId)
            const servicio = config.servicios.find(s => String(s.id) === String(reservaBody.servicio) ||
                s.nombre === reservaBody.servicio);
            if (servicio) {
                precioBase = servicio.enOferta && servicio.precioOferta ? servicio.precioOferta : (servicio.precio || 0);
            }
        }
        const staffNombre = await resolveStaffNombre(reservaBody.staffId, idNegocio);
        // Crear objeto de reserva
        const reservaId = (0, uuid_1.v4)();
        const reservaData = {
            _id: reservaId,
            idNegocio: idNegocio,
            staffId: reservaBody.staffId,
            ...(staffNombre && { staffNombre }),
            usuario: {
                nombre: reservaBody.usuario.nombre.trim(),
                email: reservaBody.usuario.email.trim().toLowerCase(),
                telefono: reservaBody.usuario.telefono?.trim()
            },
            fechaInicio: fechaInicio,
            servicio: reservaBody.servicio,
            precioFinal: precioBase, // Guardar el precio encontrado
            estado: 'pendiente_email',
            confirmacionToken,
            cancellation_token: cancellationToken,
            ratingToken, // Guardar el token de valoración
            duracion: reservaBody.duracion || 30,
            expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutos
        };
        // Añadir fechaFin si existe
        if (reservaBody.fechaFin) {
            const fechaFin = new Date(reservaBody.fechaFin);
            if (isNaN(fechaFin.getTime())) {
                return res.status(400).json({
                    error: "Fecha inválida",
                    detalles: "La fecha de fin no es válida"
                });
            }
            if (fechaFin <= fechaInicio) {
                return res.status(400).json({
                    error: "Fechas inconsistentes",
                    detalles: "La fecha de fin debe ser posterior a la fecha de inicio"
                });
            }
            reservaData.fechaFin = fechaFin;
        }
        // Crear y guardar la reserva
        const nuevaReserva = new reserva_model_1.ReservaModel(reservaData);
        const reservaGuardada = await nuevaReserva.save();
        return res.status(201).json({
            token: reservaGuardada.confirmacionToken,
            emailContacto: negocioPermitido.emailContacto,
            cancellationToken: reservaGuardada.cancellation_token
        });
    }
    catch (error) {
        console.error('Error en createReserva:', error);
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        return res.status(500).json({
            error: "Error al crear reserva",
            detalles: process.env.NODE_ENV === 'development' ? errorMessage : undefined
        });
    }
};
exports.createReserva = createReserva;
const addReservaAdmin = async (req, res) => {
    try {
        const { idNegocio, ...reservaDataRaw } = req.body;
        const { staffNombre: _clientStaffNombre, ...reservaData } = reservaDataRaw;
        if (!idNegocio) {
            return res.status(400).json({ message: 'idNegocio es requerido' });
        }
        const inicio = new Date(reservaData.fechaInicio);
        if (isNaN(inicio.getTime())) {
            return res.status(400).json({ message: 'fechaInicio inválida' });
        }
        const config = await config_model_1.BusinessConfigModel.findOne({ idNegocio });
        const duracionAdmin = reservaData.duracion || 30;
        const solapesAdmin = await countReservasSolapadas(idNegocio, inicio, duracionAdmin, reservaData.staffId);
        if (reservaData.staffId) {
            if (solapesAdmin > 0) {
                return res.status(409).json({ message: 'Ese profesional ya tiene una reserva en ese horario.' });
            }
        }
        else {
            const poolCapAdmin = await poolCapacitySinProfesionalAsignado(idNegocio, config?.maxReservasPorSlot ?? 1, reservaData.servicio);
            if (solapesAdmin >= poolCapAdmin) {
                return res.status(409).json({ message: 'No hay huecos libres para ese horario.' });
            }
        }
        // Obtener precio base del servicio
        let precioBase = 0;
        if (config) {
            const servicio = config.servicios.find(s => s.id === reservaData.servicio);
            if (servicio) {
                precioBase = servicio.enOferta && servicio.precioOferta ? servicio.precioOferta : (servicio.precio || 0);
            }
        }
        const uniqueToken = `admin-generated-${crypto_1.default.randomBytes(8).toString('hex')}`;
        const ratingToken = crypto_1.default.randomBytes(32).toString('hex');
        const staffNombreAdmin = await resolveStaffNombre(reservaData.staffId, idNegocio);
        const reserva = new reserva_model_1.ReservaModel({
            _id: (0, uuid_1.v4)(),
            ...reservaData,
            precioFinal: reservaData.precioFinal !== undefined ? reservaData.precioFinal : precioBase,
            ...(idNegocio && { idNegocio }),
            staffNombre: staffNombreAdmin,
            confirmacionToken: uniqueToken,
            ratingToken,
            estado: 'confirmada'
        });
        await reserva.save();
        res.status(201).json(reserva);
    }
    catch (error) {
        console.error('Error en addReservaAdmin:', error);
        res.status(500).json({ message: 'Error al crear la reserva de administrador' });
    }
};
exports.addReservaAdmin = addReservaAdmin;
const confirmarReservaDefinitiva = async (req, res) => {
    try {
        const { token } = req.params;
        const reserva = await reserva_model_1.ReservaModel.findOneAndUpdate({
            confirmacionToken: token,
            estado: 'pendiente_email',
            expiresAt: { $gt: new Date() }
        }, { $set: { estado: 'confirmada' }, $unset: { expiresAt: 1 } }, { new: true });
        if (!reserva) {
            return res.status(404).json({ error: "Reserva no encontrada o ya confirmada" });
        }
        res.json({ success: true, reserva });
    }
    catch (error) {
        console.error('Error en confirmarReservaDefinitiva:', error);
        res.status(500).json({ error: "Error al confirmar reserva" });
    }
};
exports.confirmarReservaDefinitiva = confirmarReservaDefinitiva;
const confirmarReservaAdmin = async (req, res) => {
    try {
        const { id } = req.params;
        const reserva = await reserva_model_1.ReservaModel.findByIdAndUpdate(id, { $set: { estado: 'confirmada' }, $unset: { expiresAt: 1 } }, { new: true });
        if (!reserva) {
            return res.status(404).json({ message: 'Reserva no encontrada' });
        }
        res.json(reserva);
    }
    catch (error) {
        console.error('Error al confirmar reserva por admin:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};
exports.confirmarReservaAdmin = confirmarReservaAdmin;
const getReservas = async (req, res) => {
    try {
        const { fecha, estado, idNegocio, startDate, endDate } = req.query;
        let query = {};
        if (idNegocio) {
            query.idNegocio = idNegocio;
        }
        else {
            query.idNegocio = { $exists: false };
        }
        if (estado && typeof estado === 'string') {
            query.estado = estado;
        }
        else {
            query.estado = { $in: ['pendiente', 'pendiente_email', 'confirmada', 'cancelada'] };
        }
        // Filtro por fecha única (retrocompatibilidad)
        if (fecha && !startDate && !endDate) {
            if (isNaN(Date.parse(fecha))) {
                return res.status(400).json({
                    error: "Formato de fecha inválido",
                    detalles: "Use formato YYYY-MM-DD"
                });
            }
            const sDate = new Date(fecha);
            sDate.setHours(0, 0, 0, 0);
            const eDate = new Date(sDate);
            eDate.setDate(sDate.getDate() + 1);
            query.fechaInicio = {
                $gte: sDate,
                $lt: eDate
            };
        }
        // Filtro por rango de fechas (nuevo)
        else if (startDate || endDate) {
            query.fechaInicio = {};
            if (startDate) {
                const sDate = new Date(startDate);
                sDate.setHours(0, 0, 0, 0);
                query.fechaInicio.$gte = sDate;
            }
            if (endDate) {
                const eDate = new Date(endDate);
                eDate.setHours(23, 59, 59, 999);
                query.fechaInicio.$lte = eDate;
            }
        }
        // Añade .select('+duracion') para asegurar que trae el campo aunque no esté en el schema
        const reservas = await reserva_model_1.ReservaModel.find(query)
            .sort({ fechaInicio: 1 })
            .select('+duracion')
            .lean();
        const response = reservas.map(reserva => {
            const lean = reserva;
            return {
                id: reserva._id.toString(),
                usuario: {
                    nombre: reserva.usuario.nombre,
                    email: reserva.usuario.email,
                    ...(reserva.usuario.telefono && { telefono: reserva.usuario.telefono })
                },
                fechaInicio: reserva.fechaInicio.toISOString(),
                ...(reserva.fechaFin && { fechaFin: reserva.fechaFin.toISOString() }),
                ...(reserva.expiresAt && { expiresAt: reserva.expiresAt.toISOString() }),
                servicio: reserva.servicio,
                estado: reserva.estado,
                confirmacionToken: reserva.confirmacionToken || '',
                duracion: reserva.duracion || 30,
                precioFinal: reserva.precioFinal,
                notas: reserva.notas,
                ...(lean.staffId && { staffId: lean.staffId }),
                ...(lean.staffNombre && { staffNombre: lean.staffNombre })
            };
        });
        return res.json(response);
    }
    catch (error) {
        console.error('Error en getReservas:', error);
        return res.status(500).json({
            error: "Error al obtener reservas",
            ...(process.env.NODE_ENV === 'development' && {
                detalles: error instanceof Error ? error.message : String(error)
            })
        });
    }
};
exports.getReservas = getReservas;
const confirmarReserva = async (req, res) => {
    try {
        const { token } = req.params;
        if (!process.env.JWT_SECRET) {
            throw new Error("JWT_SECRET no configurado");
        }
        // Verificar token
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        // Buscar y actualizar reserva
        const reserva = await reserva_model_1.ReservaModel.findOneAndUpdate({
            'usuario.email': decoded.email,
            fechaInicio: new Date(decoded.fecha),
            servicio: decoded.servicio,
            estado: 'pendiente_email'
        }, { $set: { estado: 'confirmada' }, $unset: { expiresAt: 1 } }, { new: true });
        if (!reserva) {
            console.error('Reserva no encontrada con estos datos:', {
                email: decoded.email,
                fecha: decoded.fecha,
                servicio: decoded.servicio
            });
            return res.status(404).json({ error: "Reserva no encontrada" });
        }
        // Respuesta exitosa
        res.json({
            success: true,
            reserva: {
                id: reserva._id,
                servicio: reserva.servicio,
                fecha: reserva.fechaInicio
            }
        });
    }
    catch (error) {
        console.error('Error completo:', error);
        res.status(400).json({
            error: error instanceof Error ? error.message : 'Error desconocido'
        });
    }
};
exports.confirmarReserva = confirmarReserva;
const deleteReserva = async (req, res) => {
    try {
        const { id } = req.params;
        const { idNegocio } = req.query;
        const query = { _id: id };
        if (idNegocio) {
            query.idNegocio = idNegocio;
        }
        else {
            query.idNegocio = { $exists: false };
        }
        const result = await reserva_model_1.ReservaModel.deleteOne(query);
        if (result.deletedCount === 0) {
            return res.status(404).json({
                error: "Reserva no encontrada"
            });
        }
        return res.json({ success: true });
    }
    catch (error) {
        console.error('Error al eliminar reserva:', error);
        return res.status(500).json({
            error: "Error al eliminar reserva"
        });
    }
};
exports.deleteReserva = deleteReserva;
const cancelarReserva = async (req, res) => {
    try {
        const { id } = req.params;
        const reserva = await reserva_model_1.ReservaModel.findByIdAndUpdate(id, { $set: { estado: 'cancelada' } }, { new: true });
        if (!reserva) {
            return res.status(404).json({ message: 'Reserva no encontrada' });
        }
        res.json(reserva);
    }
    catch (error) {
        console.error('Error al cancelar reserva por admin:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};
exports.cancelarReserva = cancelarReserva;
const cancelarReservaPorToken = async (req, res) => {
    try {
        const { token } = req.params;
        const reserva = await reserva_model_1.ReservaModel.findOneAndUpdate({ cancellation_token: token, estado: { $ne: 'cancelada' } }, { $set: { estado: 'cancelada' } }, { new: true });
        if (!reserva) {
            return res.status(404).json({ message: 'Reserva no encontrada o ya cancelada' });
        }
        res.json({ success: true, message: 'Reserva cancelada correctamente', businessId: reserva.idNegocio });
    }
    catch (error) {
        console.error('Error al cancelar reserva por token:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};
exports.cancelarReservaPorToken = cancelarReservaPorToken;
const updateReserva = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        const reserva = await reserva_model_1.ReservaModel.findByIdAndUpdate(id, { $set: updateData }, { new: true });
        if (!reserva) {
            return res.status(404).json({ message: 'Reserva no encontrada' });
        }
        res.json(reserva);
    }
    catch (error) {
        console.error('Error al actualizar reserva:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};
exports.updateReserva = updateReserva;
const getStatistics = async (req, res) => {
    try {
        const { idNegocio, fechaInicio, fechaFin } = req.query;
        if (!idNegocio) {
            return res.status(400).json({ message: 'El idNegocio es requerido' });
        }
        let query = {
            idNegocio: idNegocio,
            estado: 'confirmada'
        };
        if (fechaInicio || fechaFin) {
            query.fechaInicio = {};
            if (fechaInicio) {
                query.fechaInicio.$gte = new Date(fechaInicio);
            }
            if (fechaFin) {
                query.fechaInicio.$lte = new Date(fechaFin);
            }
        }
        const reservas = await reserva_model_1.ReservaModel.find(query);
        const totalFacturado = reservas.reduce((acc, curr) => acc + (curr.precioFinal || 0), 0);
        const totalReservas = reservas.length;
        res.json({
            totalFacturado,
            totalReservas,
            count: reservas.length
        });
    }
    catch (error) {
        console.error('Error al obtener estadísticas:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};
exports.getStatistics = getStatistics;
const checkDisponibilidad = async (req, res) => {
    try {
        const { idNegocio, fecha, hora, duracion, staffId, fechaInicio: fechaInicioParam, servicio: servicioQuery } = req.query;
        if (!idNegocio || !duracion) {
            return res.status(400).json({ error: 'Faltan parámetros requeridos' });
        }
        const config = await config_model_1.BusinessConfigModel.findOne({ idNegocio: idNegocio });
        if (!config) {
            return res.status(404).json({ error: 'Configuración no encontrada' });
        }
        let fechaInicio;
        if (fechaInicioParam && typeof fechaInicioParam === 'string') {
            fechaInicio = new Date(fechaInicioParam);
        }
        else if (fecha && hora) {
            fechaInicio = new Date(`${fecha}T${hora}:00`);
        }
        else {
            return res.status(400).json({ error: 'Se requiere fechaInicio (ISO) o fecha y hora' });
        }
        if (isNaN(fechaInicio.getTime())) {
            return res.status(400).json({ error: 'fechaInicio inválida' });
        }
        // YYYY-MM-DD para festivos y horarios especiales (cuando solo viene fechaInicio ISO, `fecha` query va vacía)
        const dateStrCalendario = typeof fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fecha)
            ? fecha
            : typeof fechaInicioParam === 'string' && fechaInicioParam.length >= 10
                ? fechaInicioParam.slice(0, 10)
                : fechaInicio.toISOString().slice(0, 10);
        const fechaFin = new Date(fechaInicio.getTime() + Number(duracion) * 60000);
        // 1. Validar festivos (con prioridad para horarios especiales)
        const hasSpecialSchedule = config.horariosEspeciales?.some(h => h.fecha === dateStrCalendario && h.activo);
        if (!hasSpecialSchedule) {
            const isHoliday = await holiday_service_1.holidayService.isHoliday(dateStrCalendario, config.provincia);
            if (isHoliday) {
                return res.json(false);
            }
        }
        // 2. Validar antelación mínima
        if (config.antelacionMinimaHoras && config.antelacionMinimaHoras > 0) {
            const minDate = new Date();
            minDate.setHours(minDate.getHours() + config.antelacionMinimaHoras);
            if (fechaInicio < minDate) {
                return res.json(false);
            }
        }
        const overlapping = await countReservasSolapadas(idNegocio, fechaInicio, Number(duracion), staffId ? staffId : null);
        if (staffId) {
            return res.json(overlapping === 0);
        }
        const servicioId = typeof servicioQuery === 'string' ? servicioQuery : undefined;
        const poolCap = await poolCapacitySinProfesionalAsignado(idNegocio, config.maxReservasPorSlot ?? 1, servicioId);
        if (overlapping >= poolCap) {
            return res.json(false);
        }
        return res.json(true);
    }
    catch (error) {
        console.error('Error en checkDisponibilidad:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};
exports.checkDisponibilidad = checkDisponibilidad;
const getHolidays = async (req, res) => {
    try {
        const { year, provincia } = req.query;
        if (!year)
            return res.status(400).json({ error: 'El año es requerido' });
        const y = typeof year === 'string' ? parseInt(year, 10) : Number(year);
        const holidays = await holiday_service_1.holidayService.getHolidays(y);
        // Filtrar por provincia si se proporciona
        const filteredHolidays = holidays.filter(h => {
            if (h.global || h.counties === null)
                return true;
            if (provincia && Array.isArray(h.counties) && h.counties.includes(`ES-${provincia}`))
                return true;
            return false;
        });
        res.json(filteredHolidays);
    }
    catch (error) {
        console.error('Error al obtener festivos:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};
exports.getHolidays = getHolidays;
