const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
    reporter:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    targetType: { type: String, enum: ['song', 'comment', 'user'], required: true },
    targetId:   { type: mongoose.Schema.Types.ObjectId, required: true },
    reason:     { type: String, required: true, trim: true, maxlength: 500 },
    status:     { type: String, enum: ['pending', 'resolved', 'dismissed'], default: 'pending' },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    resolvedAt: { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model('Report', reportSchema);
