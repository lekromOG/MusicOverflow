import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './SongPage.css';

const API_BASE = 'http://localhost:5000/api';

const NAV_ITEMS = [
    { id: 'home',     icon: 'bi-house-fill',      label: 'Home'     },
    { id: 'library',  icon: 'bi-collection-fill',  label: 'Library'  },
    { id: 'profile',  icon: 'bi-person-fill',      label: 'Profile'  },
    { id: 'settings', icon: 'bi-gear-fill',        label: 'Settings' },
];

function formatDuration(secs) {
    if (!secs || isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatNumber(n) {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
    return String(n || 0);
}

function formatCommentDate(dateStr) {
    const d = new Date(dateStr);
    const diffMs = Date.now() - d.getTime();
    const mins = Math.floor(diffMs / 60_000);
    if (mins < 1)  return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)  return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7)  return `${days}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getVolumeIcon(v) {
    if (v === 0) return 'bi-volume-mute-fill';
    if (v < 50)  return 'bi-volume-down-fill';
    return 'bi-volume-up-fill';
}

function AvatarImg({ src, alt, className, fallbackSize = 18 }) {
    const [failed, setFailed] = useState(false);
    return failed ? (
        <div className="avatar-fallback-icon" style={{ fontSize: fallbackSize }}>
            <i className="bi bi-person-fill" />
        </div>
    ) : (
        <img className={className} src={src} alt={alt} onError={() => setFailed(true)} />
    );
}

export default function SongPage() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [loggedInUser] = useState(() => JSON.parse(localStorage.getItem('user') || 'null'));

    const [song, setSong]           = useState(null);
    const [loading, setLoading]     = useState(true);
    const [error, setError]         = useState(null);
    const [likeCount, setLikeCount] = useState(0);
    const [isLiked, setIsLiked]     = useState(false);
    const [likeLoading, setLikeLoading] = useState(false);

    const audioRef         = useRef(null);
    const audioInitialized = useRef(false);
    const [playerStarted, setPlayerStarted] = useState(false);
    const [isPlaying, setIsPlaying]   = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration]     = useState(0);
    const [volume, setVolume]         = useState(70);
    const [isLoop, setIsLoop]         = useState(false);
    const [isShuffle, setIsShuffle]   = useState(false);
    const [streamError, setStreamError] = useState(null);

    const [comments, setComments]           = useState([]);
    const [commentsLoading, setCommentsLoading] = useState(true);
    const [commentText, setCommentText]     = useState('');
    const [submitting, setSubmitting]       = useState(false);
    const [commentError, setCommentError]   = useState(null);

    const navItems = loggedInUser?.isAdmin
        ? [...NAV_ITEMS, { id: 'admin', icon: 'bi-shield-fill-check', label: 'Admin' }]
        : NAV_ITEMS;

    const loggedInUserId = loggedInUser?._id || loggedInUser?.id;

    // Load song
    useEffect(() => {
        setLoading(true);
        axios.get(`${API_BASE}/songs/${id}`)
            .then(res => {
                setSong(res.data);
                setLikeCount(res.data.likes?.length || 0);
                setDuration(res.data.duration || 0);
                if (loggedInUserId) {
                    setIsLiked(res.data.likes?.some(l => l.toString() === loggedInUserId.toString()) ?? false);
                }
            })
            .catch(() => setError('Song not found'))
            .finally(() => setLoading(false));
    }, [id]); // eslint-disable-line

    // Load comments
    useEffect(() => {
        setCommentsLoading(true);
        axios.get(`${API_BASE}/comments/song/${id}`)
            .then(res => setComments(res.data))
            .catch(() => {})
            .finally(() => setCommentsLoading(false));
    }, [id]);

    // Player: play / pause
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio || !audioInitialized.current) return;
        if (isPlaying) audio.play().catch(() => setIsPlaying(false));
        else audio.pause();
    }, [isPlaying]);

    useEffect(() => { if (audioRef.current) audioRef.current.volume = volume / 100; }, [volume]);
    useEffect(() => { if (audioRef.current) audioRef.current.loop = isLoop; }, [isLoop]);

    const handlePlay = () => {
        const audio = audioRef.current;
        if (!audio) return;
        if (!audioInitialized.current) {
            audio.src = `${API_BASE}/songs/${id}/stream`;
            audio.volume = volume / 100;
            audio.load();
            audio.play().catch(() => setIsPlaying(false));
            audioInitialized.current = true;
            setIsPlaying(true);
            setPlayerStarted(true);
            axios.post(`${API_BASE}/songs/${id}/play`).catch(() => {});
        } else {
            setIsPlaying(p => !p);
        }
    };

    const handleLike = async () => {
        if (!loggedInUser) { navigate('/login'); return; }
        if (likeLoading) return;
        setLikeLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`${API_BASE}/songs/${id}/like`, {}, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setLikeCount(res.data.likes);
            setIsLiked(res.data.isLiked);
        } catch { /* ignore */ }
        finally { setLikeLoading(false); }
    };

    const handleAddComment = async (e) => {
        e.preventDefault();
        if (!commentText.trim() || submitting) return;
        setSubmitting(true);
        setCommentError(null);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(
                `${API_BASE}/comments/song/${id}`,
                { content: commentText.trim() },
                { headers: { Authorization: `Bearer ${token}` } },
            );
            setComments(prev => [res.data, ...prev]);
            setCommentText('');
        } catch (err) {
            setCommentError(err.response?.data?.message || 'Failed to post comment');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteComment = async (commentId) => {
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${API_BASE}/comments/${commentId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setComments(prev => prev.filter(c => c._id !== commentId));
        } catch { /* ignore */ }
    };

    const [deleteConfirm, setDeleteConfirm] = useState(false);
    const [deleting, setDeleting]           = useState(false);

    const handleDeleteSong = async () => {
        if (!deleteConfirm) { setDeleteConfirm(true); return; }
        setDeleting(true);
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${API_BASE}/songs/${id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            navigate('/');
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to delete song');
            setDeleting(false);
            setDeleteConfirm(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    const sidebar = (
        <aside className="left-nav">
            <div className="nav-brand">
                <div className="nav-logo"><i className="bi bi-music-note-beamed" /></div>
                <div className="nav-brand-text">
                    <span className="nav-app-name">MusicOverflow</span>
                    <span className="nav-version">v0.1.0-dev</span>
                </div>
            </div>
            <nav className="nav-links">
                {navItems.map(item => (
                    <button
                        key={item.id}
                        className={`nav-item${item.id === 'library' ? ' active' : ''}`}
                        onClick={() => {
                            if (item.id === 'home') navigate('/');
                            else if (item.id === 'profile') {
                                if (loggedInUserId) navigate(`/profile/${loggedInUserId}`);
                                else navigate('/login');
                            } else navigate('/');
                        }}
                    >
                        <i className={`bi ${item.icon}`} />
                        <span>{item.label}</span>
                    </button>
                ))}
            </nav>
            <div className="nav-playlists">
                <div className="playlists-header">
                    <span className="playlists-title">PLAYLISTS</span>
                    <button className="playlist-add-btn" title="New playlist">
                        <i className="bi bi-plus" />
                    </button>
                </div>
                <p className="playlists-empty">No playlists yet</p>
            </div>
            {loggedInUser && (
                <button className="nav-logout-btn" onClick={handleLogout}>
                    <i className="bi bi-box-arrow-right" />
                    <span>Logout</span>
                </button>
            )}
        </aside>
    );

    if (loading) {
        return (
            <div className="song-page-wrapper">
                {sidebar}
                <main className="song-main">
                    <div className="song-loading">
                        <i className="bi bi-arrow-repeat song-spin" />
                        <p>Loading song…</p>
                    </div>
                </main>
            </div>
        );
    }

    if (error || !song) {
        return (
            <div className="song-page-wrapper">
                {sidebar}
                <main className="song-main">
                    <div className="song-loading">
                        <i className="bi bi-music-note-beamed" style={{ fontSize: 48, marginBottom: 12 }} />
                        <p>{error || 'Song not found'}</p>
                        <button className="song-back-btn" onClick={() => navigate('/')}>
                            <i className="bi bi-arrow-left" /> Back to Home
                        </button>
                    </div>
                </main>
            </div>
        );
    }

    const coverUrl   = song.coverArtId ? `${API_BASE}/songs/${id}/cover` : '/PK_SYGNET_RGB.jpg';
    const artistId   = song.artist?._id || song.artist;
    const artistAvatar = `${API_BASE}/users/${artistId}/profile-picture`;
    const userAvatar   = loggedInUser ? `${API_BASE}/users/${loggedInUserId}/profile-picture` : null;

    return (
        <div className={`song-page-wrapper${playerStarted ? ' song-has-player' : ''}`}>
            <audio
                ref={audioRef}
                onTimeUpdate={e => setCurrentTime(e.target.currentTime)}
                onLoadedMetadata={e => setDuration(e.target.duration)}
                onEnded={() => { setIsPlaying(false); setCurrentTime(0); }}
                onError={e => {
                    const code = e.target.error?.code;
                    setStreamError(code === 4 ? 'No audio file found for this song' : 'Could not load audio');
                    setIsPlaying(false);
                }}
            />

            {sidebar}

            <main className="song-main">
                {/* Back */}
                <div className="song-back-bar">
                    <button className="song-back-btn" onClick={() => navigate(-1)}>
                        <i className="bi bi-arrow-left" /> Back
                    </button>
                </div>

                {/* Hero */}
                <div className="song-hero">
                    <div className="song-hero-cover-wrap">
                        <img className="song-hero-cover" src={coverUrl} alt={song.title} />
                        <button className="song-hero-play-overlay" onClick={handlePlay}>
                            <i className={`bi ${isPlaying ? 'bi-pause-fill' : 'bi-play-fill'}`} />
                        </button>
                    </div>

                    <div className="song-hero-info">
                        {song.genre && <span className="song-hero-genre">{song.genre}</span>}

                        <h1 className="song-hero-title">{song.title}</h1>

                        <div className="song-hero-artist" onClick={() => navigate(`/profile/${artistId}`)}>
                            <div className="song-hero-artist-avatar">
                                <AvatarImg src={artistAvatar} alt={song.artist?.username} fallbackSize={16} />
                            </div>
                            <span>{song.artist?.username || 'Unknown'}</span>
                        </div>

                        <div className="song-hero-stats">
                            <span className="song-hero-stat">
                                <i className="bi bi-play-fill" /> {formatNumber(song.plays)}
                            </span>
                            <span className="song-hero-stat">
                                <i className="bi bi-heart-fill" /> {formatNumber(likeCount)}
                            </span>
                            <span className="song-hero-stat">
                                <i className="bi bi-clock" /> {formatDuration(song.duration)}
                            </span>
                        </div>

                        <div className="song-hero-actions">
                            <button className="song-play-btn" onClick={handlePlay}>
                                <i className={`bi ${isPlaying ? 'bi-pause-fill' : 'bi-play-fill'}`} />
                                {isPlaying ? 'Pause' : 'Play'}
                            </button>
                            <button
                                className={`song-like-btn${isLiked ? ' liked' : ''}`}
                                onClick={handleLike}
                                disabled={likeLoading}
                            >
                                <i className={`bi ${isLiked ? 'bi-heart-fill' : 'bi-heart'}`} />
                                {formatNumber(likeCount)}
                            </button>
                            {loggedInUser?.isAdmin && (
                                <button
                                    className={`song-delete-btn${deleteConfirm ? ' confirm' : ''}`}
                                    onClick={handleDeleteSong}
                                    disabled={deleting}
                                    onBlur={() => setDeleteConfirm(false)}
                                >
                                    <i className="bi bi-trash3-fill" />
                                    {deleteConfirm ? 'Confirm Delete' : 'Delete Song'}
                                </button>
                            )}
                        </div>

                        {streamError && (
                            <div className="song-stream-error">
                                <i className="bi bi-exclamation-circle" /> {streamError}
                            </div>
                        )}
                    </div>
                </div>

                {/* Comments */}
                <div className="song-comments-section">
                    <h2 className="song-comments-title">
                        <i className="bi bi-chat-dots-fill" />
                        Comments <span className="comments-count">({comments.length})</span>
                    </h2>

                    {loggedInUser ? (
                        <form className="comment-form" onSubmit={handleAddComment}>
                            <div className="comment-form-avatar">
                                <AvatarImg src={userAvatar} alt={loggedInUser.username} fallbackSize={18} />
                            </div>
                            <div className="comment-form-input-wrap">
                                <input
                                    className="comment-input"
                                    type="text"
                                    placeholder="Add a comment…"
                                    value={commentText}
                                    onChange={e => setCommentText(e.target.value)}
                                    maxLength={500}
                                    disabled={submitting}
                                />
                                {commentError && <span className="comment-error">{commentError}</span>}
                            </div>
                            <button
                                className="comment-submit-btn"
                                type="submit"
                                disabled={!commentText.trim() || submitting}
                            >
                                {submitting
                                    ? <i className="bi bi-arrow-repeat comment-spin" />
                                    : 'Post'
                                }
                            </button>
                        </form>
                    ) : (
                        <div className="comment-login-prompt">
                            <i className="bi bi-lock-fill" />
                            <span>Log in to leave a comment</span>
                            <button onClick={() => navigate('/login')}>Log In</button>
                        </div>
                    )}

                    <div className="comments-list">
                        {commentsLoading ? (
                            <div className="comments-loading">
                                <i className="bi bi-arrow-repeat comment-spin" /> Loading comments…
                            </div>
                        ) : comments.length === 0 ? (
                            <div className="comments-empty">
                                <i className="bi bi-chat" />
                                <p>No comments yet. Be the first!</p>
                            </div>
                        ) : (
                            comments.map(comment => {
                                const authorAvatar = `${API_BASE}/users/${comment.author._id}/profile-picture`;
                                const isOwnComment = loggedInUserId?.toString() === comment.author._id?.toString();
                                const canDelete = isOwnComment || loggedInUser?.isAdmin;

                                return (
                                    <div key={comment._id} className="comment-item">
                                        <div className="comment-avatar-wrap">
                                            <AvatarImg
                                                src={authorAvatar}
                                                alt={comment.author.username}
                                                className="comment-avatar"
                                                fallbackSize={18}
                                            />
                                        </div>
                                        <div className="comment-body">
                                            <div className="comment-header">
                                                <span
                                                    className="comment-author"
                                                    onClick={() => navigate(`/profile/${comment.author._id}`)}
                                                >
                                                    {comment.author.username}
                                                </span>
                                                <span className="comment-date">
                                                    {formatCommentDate(comment.createdAt)}
                                                </span>
                                            </div>
                                            <p className="comment-text">{comment.content}</p>
                                        </div>
                                        {canDelete && (
                                            <button
                                                className="comment-delete-btn"
                                                onClick={() => handleDeleteComment(comment._id)}
                                                title="Delete comment"
                                            >
                                                <i className="bi bi-trash3" />
                                            </button>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </main>

            {/* Player bar — appears once user hits Play */}
            {playerStarted && (
                <footer className="song-player">
                    <div className="player-left">
                        <div className="player-cover">
                            <img src={coverUrl} alt={song.title} />
                        </div>
                        <div className="player-meta">
                            <span className="player-title">{song.title}</span>
                            {streamError
                                ? <span className="player-stream-error">
                                    <i className="bi bi-exclamation-circle" /> {streamError}
                                  </span>
                                : <span className="player-artist">{song.artist?.username || 'Unknown'}</span>
                            }
                        </div>
                        <button
                            className={`player-like${isLiked ? ' liked' : ''}`}
                            onClick={handleLike}
                            disabled={likeLoading}
                        >
                            <i className={`bi ${isLiked ? 'bi-heart-fill' : 'bi-heart'}`} />
                        </button>
                    </div>

                    <div className="player-center">
                        <div className="player-controls">
                            <button className={`ctrl-btn${isShuffle ? ' active' : ''}`}
                                onClick={() => setIsShuffle(s => !s)} title="Shuffle">
                                <i className="bi bi-shuffle" />
                            </button>
                            <button className="ctrl-btn" title="Previous">
                                <i className="bi bi-skip-start-fill" />
                            </button>
                            <button className="ctrl-btn play-btn" onClick={handlePlay}
                                title={isPlaying ? 'Pause' : 'Play'}>
                                <i className={`bi ${isPlaying ? 'bi-pause-fill' : 'bi-play-fill'}`} />
                            </button>
                            <button className="ctrl-btn" title="Next">
                                <i className="bi bi-skip-end-fill" />
                            </button>
                            <button className={`ctrl-btn${isLoop ? ' active' : ''}`}
                                onClick={() => setIsLoop(l => !l)} title="Loop">
                                <i className="bi bi-repeat" />
                            </button>
                        </div>
                        <div className="player-progress-row">
                            <span className="player-time">{formatDuration(currentTime)}</span>
                            <input
                                type="range" className="progress-slider"
                                min="0" max={duration || 0} step="0.1" value={currentTime}
                                onChange={e => {
                                    const t = Number(e.target.value);
                                    setCurrentTime(t);
                                    if (audioRef.current) audioRef.current.currentTime = t;
                                }}
                            />
                            <span className="player-time">{formatDuration(duration)}</span>
                        </div>
                    </div>

                    <div className="player-right">
                        <i className={`bi ${getVolumeIcon(volume)}`} />
                        <input
                            type="range" className="volume-slider"
                            min="0" max="100" value={volume}
                            onChange={e => setVolume(Number(e.target.value))}
                        />
                    </div>
                </footer>
            )}
        </div>
    );
}
