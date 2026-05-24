const Report = require('../models/report');

const VALID_TYPES = new Set(['song', 'comment', 'user']);

const VALID_REASONS = new Set([
    'Spam or misleading',
    'Inappropriate content',
    'Copyright infringement',
    'Harassment or hate speech',
    'Other',
]);

const submitReport = async (req, res) => {
    try {
        if (req.user.isAdmin) {
            return res.status(403).json({ message: 'Admins cannot submit reports' });
        }

        const { targetType, targetId, reason } = req.body;

        if (!VALID_TYPES.has(targetType)) {
            return res.status(400).json({ message: 'Invalid target type' });
        }
        if (!targetId) {
            return res.status(400).json({ message: 'targetId is required' });
        }
        if (!VALID_REASONS.has(reason)) {
            return res.status(400).json({ message: 'Invalid reason' });
        }

        const existing = await Report.findOne({
            reporter: req.user._id,
            targetId,
            status: 'pending',
        });

        if (existing) {
            return res.status(409).json({ message: 'You have already reported this' });
        }

        await Report.create({
            reporter:   req.user._id,
            targetType,
            targetId,
            reason,
        });

        res.status(201).json({ message: 'Report submitted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

module.exports = { submitReport };
