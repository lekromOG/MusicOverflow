const mongoose = require('mongoose');
const Song = require('../models/song');

const getSongs = async (req, res) => {
    try {
        const songs = await Song.find({ isPublic: true })
            .populate('artist', 'username profilePicture')
            .sort({ createdAt: -1 });
        res.status(200).json(songs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getSongById = async (req, res) => {
    try {
        const song = await Song.findById(req.params.id)
            .populate('artist', 'username profilePicture');
        if (!song || !song.isPublic) return res.status(404).json({ message: 'Song not found' });
        res.status(200).json(song);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const streamSong = async (req, res) => {
    try {
        const song = await Song.findById(req.params.id);
        if (!song || !song.isPublic) return res.status(404).json({ message: 'Song not found' });

        console.log(`[stream] "${song.title}" → audioFileId: ${song.audioFileId}`);

        const { GridFSBucket } = mongoose.mongo;
        const bucket = new GridFSBucket(mongoose.connection.db);
        const files = await bucket.find({ _id: song.audioFileId }).toArray();

        console.log(`[stream] GridFS lookup (bucket=fs): ${files.length} file(s) found`);

        if (!files.length) {
            // Also try listing ALL files in the bucket to help diagnose wrong bucket name
            const allFiles = await bucket.find({}).limit(5).toArray();
            console.log(`[stream] Total files in fs bucket: ${allFiles.length}`, allFiles.map(f => f._id));
            return res.status(404).json({ message: 'Audio file not found in GridFS' });
        }

        const file = files[0];
        const fileSize = file.length;
        const contentType = file.contentType || 'audio/mpeg';
        const range = req.headers.range;

        if (range) {
            const [startStr, endStr] = range.replace(/bytes=/, '').split('-');
            const start = parseInt(startStr, 10);
            const end = endStr ? parseInt(endStr, 10) : fileSize - 1;
            const chunkSize = end - start + 1;

            res.writeHead(206, {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunkSize,
                'Content-Type': contentType,
            });
            bucket.openDownloadStream(song.audioFileId, { start, end: end + 1 }).pipe(res);
        } else {
            res.set({
                'Content-Type': contentType,
                'Content-Length': fileSize,
                'Accept-Ranges': 'bytes',
            });
            bucket.openDownloadStream(song.audioFileId).pipe(res);
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const uploadSong = async (req, res) => {
    try {
        const audioFile = req.files?.audio?.[0];
        const coverFile = req.files?.cover?.[0];

        if (!audioFile) return res.status(400).json({ message: 'No audio file provided' });

        const { title, genre, duration } = req.body;
        if (!title)    return res.status(400).json({ message: 'Title is required' });
        if (!duration) return res.status(400).json({ message: 'Duration is required' });

        if (coverFile && coverFile.size > 10 * 1024 * 1024) {
            return res.status(400).json({ message: 'Cover art must be under 10 MB' });
        }

        const { GridFSBucket } = mongoose.mongo;
        const bucket = new GridFSBucket(mongoose.connection.db);

        const audioStream = bucket.openUploadStream(audioFile.originalname, {
            contentType: audioFile.mimetype,
        });
        await new Promise((resolve, reject) => {
            audioStream.on('finish', resolve);
            audioStream.on('error', reject);
            audioStream.end(audioFile.buffer);
        });

        let coverArtId = null;
        if (coverFile) {
            const coverStream = bucket.openUploadStream(coverFile.originalname, {
                contentType: coverFile.mimetype,
            });
            await new Promise((resolve, reject) => {
                coverStream.on('finish', resolve);
                coverStream.on('error', reject);
                coverStream.end(coverFile.buffer);
            });
            coverArtId = coverStream.id;
        }

        const song = new Song({
            title,
            artist: req.user._id,
            audioFileId: audioStream.id,
            coverArtId,
            duration: parseFloat(duration),
            genre: genre || 'Other',
            isPublic: true,
        });

        await song.save();
        await song.populate('artist', 'username profilePicture');

        res.status(201).json(song);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const streamCover = async (req, res) => {
    try {
        const song = await Song.findById(req.params.id).select('coverArtId');
        if (!song?.coverArtId) return res.status(404).json({ message: 'No cover art' });

        const { GridFSBucket } = mongoose.mongo;
        const bucket = new GridFSBucket(mongoose.connection.db);
        const files = await bucket.find({ _id: song.coverArtId }).toArray();
        if (!files.length) return res.status(404).json({ message: 'Cover file not found' });

        const file = files[0];
        res.set({
            'Content-Type': file.contentType || 'image/jpeg',
            'Content-Length': file.length,
            'Cache-Control': 'public, max-age=86400',
        });
        bucket.openDownloadStream(song.coverArtId).pipe(res);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getSongs, getSongById, streamSong, uploadSong, streamCover };
