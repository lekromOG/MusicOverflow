const Comment = require('../models/comment');
const Song = require('../models/song');

const getComments = async (req, res) => {
    try {
        const comments = await Comment.find({ song: req.params.songId, isDeleted: false })
            .populate('author', 'username profilePictureId')
            .sort({ createdAt: -1 });
        res.json(comments);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const addComment = async (req, res) => {
    try {
        const { content } = req.body;
        if (!content?.trim()) return res.status(400).json({ message: 'Comment cannot be empty' });

        const song = await Song.findById(req.params.songId);
        if (!song || !song.isPublic) return res.status(404).json({ message: 'Song not found' });

        const comment = new Comment({
            content: content.trim(),
            author: req.user._id,
            song: req.params.songId,
        });
        await comment.save();
        await comment.populate('author', 'username profilePictureId');
        res.status(201).json(comment);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const deleteComment = async (req, res) => {
    try {
        const comment = await Comment.findById(req.params.commentId);
        if (!comment) return res.status(404).json({ message: 'Comment not found' });

        const isOwner = comment.author.toString() === req.user._id.toString();
        if (!isOwner && !req.user.isAdmin) return res.status(403).json({ message: 'Not authorized' });

        comment.isDeleted = true;
        await comment.save();
        res.status(204).end();
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getComments, addComment, deleteComment };
