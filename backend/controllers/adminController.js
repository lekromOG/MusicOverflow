const User           = require('../models/user');
const Song           = require('../models/song');
const Comment        = require('../models/comment');
const ModerationLog  = require('../models/moderationLog');
const Report         = require('../models/report');

const escapeRegex = s => s.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');

// ── Overview ──────────────────────────────────────────────────────────────────

const getOverview = async (req, res) => {
    try {
        const [totalUsers, totalSongs, totalComments, pendingReports, bannedUsers, recentActions] =
            await Promise.all([
                User.countDocuments(),
                Song.countDocuments({ isPublic: true }),
                Comment.countDocuments({ isDeleted: false }),
                Report.countDocuments({ status: 'pending' }),
                User.countDocuments({ isBanned: true }),
                ModerationLog.find()
                    .sort({ createdAt: -1 })
                    .limit(5)
                    .populate('targetUser', 'username')
                    .populate('moderatedBy', 'username'),
            ]);
        res.json({ totalUsers, totalSongs, totalComments, pendingReports, bannedUsers, recentActions });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ── Reports ───────────────────────────────────────────────────────────────────

const getReports = async (req, res) => {
    try {
        const reports = await Report.find({ status: 'pending' })
            .sort({ createdAt: -1 })
            .populate('reporter', 'username');
        res.json(reports);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const resolveReport = async (req, res) => {
    try {
        const report = await Report.findById(req.params.id);
        if (!report) return res.status(404).json({ message: 'Report not found' });

        report.status     = req.body.action === 'dismissed' ? 'dismissed' : 'resolved';
        report.resolvedBy = req.user._id;
        report.resolvedAt = new Date();
        await report.save();
        res.json(report);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ── Users ─────────────────────────────────────────────────────────────────────

const getUsers = async (req, res) => {
    try {
        const { search } = req.query;
        const query = search
            ? { $or: [
                { username: { $regex: escapeRegex(search), $options: 'i' } },
                { email:    { $regex: escapeRegex(search), $options: 'i' } },
              ] }
            : {};
        const users = await User.find(query)
            .select('username email isAdmin isBanned banExpiresAt createdAt lastLogin')
            .sort({ createdAt: -1 })
            .limit(50);
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const banUser = async (req, res) => {
    try {
        const { reason, duration } = req.body;
        if (!reason?.trim()) return res.status(400).json({ message: 'Reason is required' });

        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        if (user.isAdmin) return res.status(403).json({ message: 'Cannot ban an admin' });

        user.isBanned    = true;
        user.banExpiresAt = duration
            ? new Date(Date.now() + Number(duration) * 24 * 60 * 60 * 1000)
            : null;
        await user.save();

        await ModerationLog.create({
            targetUser:  user._id,
            moderatedBy: req.user._id,
            action:      'ban',
            reason:      reason.trim(),
            expiresAt:   user.banExpiresAt,
        });

        res.json({ message: 'User banned', isBanned: true, banExpiresAt: user.banExpiresAt });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const unbanUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        user.isBanned     = false;
        user.banExpiresAt = null;
        await user.save();

        await ModerationLog.create({
            targetUser:  user._id,
            moderatedBy: req.user._id,
            action:      'unban',
            reason:      req.body.reason?.trim() || 'Ban lifted by admin',
            expiresAt:   null,
        });

        res.json({ message: 'User unbanned' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ── Removed comments ──────────────────────────────────────────────────────────

const getRemovedComments = async (req, res) => {
    try {
        const comments = await Comment.find({ isDeleted: true })
            .sort({ updatedAt: -1 })
            .populate('author', 'username')
            .populate('song', 'title');
        res.json(comments);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const restoreComment = async (req, res) => {
    try {
        const comment = await Comment.findById(req.params.id);
        if (!comment) return res.status(404).json({ message: 'Comment not found' });

        comment.isDeleted = false;
        await comment.save();
        res.json({ message: 'Comment restored' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const hardDeleteComment = async (req, res) => {
    try {
        const comment = await Comment.findById(req.params.id);
        if (!comment) return res.status(404).json({ message: 'Comment not found' });

        await ModerationLog.create({
            targetUser:  comment.author,
            moderatedBy: req.user._id,
            action:      'content_removed',
            reason:      'Comment permanently deleted by admin',
            expiresAt:   null,
        });

        await comment.deleteOne();
        res.json({ message: 'Comment deleted permanently' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ── Moderation log ────────────────────────────────────────────────────────────

const getModerationLog = async (req, res) => {
    try {
        const logs = await ModerationLog.find()
            .sort({ createdAt: -1 })
            .limit(200)
            .populate('targetUser', 'username')
            .populate('moderatedBy', 'username');
        res.json(logs);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

module.exports = {
    getOverview,
    getReports, resolveReport,
    getUsers, banUser, unbanUser,
    getRemovedComments, restoreComment, hardDeleteComment,
    getModerationLog,
};
