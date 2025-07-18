"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const bloqueoSchema = new mongoose_1.Schema({
    fecha: { type: Date, required: true, unique: true }
});
exports.default = (0, mongoose_1.model)('Bloqueo', bloqueoSchema);
