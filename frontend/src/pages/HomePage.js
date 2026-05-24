import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './HomePage.css';

const GENRES = ['Pop', 'Rock', 'Hip-Hop', 'Jazz', 'Classical', 'Electronic', 'R&B', 'Rap', 'Other'];

const ALLOWED_AUDIO_TYPES = new Set([
    'audio/mpeg', 'audio/mp3',
    'audio/wav', 'audio/x-wav', 'audio/wave',
    'audio/ogg',
    'audio/flac', 'audio/x-flac',
    'audio/aac', 'audio/mp4', 'audio/x-m4a',
]);
const AUDIO_ACCEPT = '.mp3,.wav,.ogg,.flac,.aac,.m4a';

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif']);
const IMAGE_ACCEPT = '.jpg,.jpeg,.png,.gif';

const NAV_ITEMS = [
    { id: 'home',     icon: 'bi-house-fill',      label: 'Home'     },
    { id: 'library',  icon: 'bi-collection-fill',  label: 'Library'  },
    { id: 'profile',  icon: 'bi-person-fill',      label: 'Profile'  },
    { id: 'settings', icon: 'bi-gear-fill',        label: 'Settings' },
];

function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
}

function getVolumeIcon(volume) {
    if (volume === 0) return 'bi-volume-mute-fill';
    if (volume < 50)  return 'bi-volume-down-fill';
    return 'bi-volume-up-fill';
}

function formatTime(secs) {
    if (!secs || isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

const COVER_BASE = 'http://localhost:5000/api/songs';

function TrackCard({ song, onSelect, isActive }) {
    const coverUrl = song.coverArtId
        ? `${COVER_BASE}/${song._id}/cover`
        : '/PK_SYGNET_RGB.jpg';

    return (
        <div
            className={`track-card${isActive ? ' now-playing' : ''}`}
            onClick={() => onSelect(song)}
        >
            <div className="track-card-cover">
                <img src={coverUrl} alt={song.title} />
            </div>
            <span className="track-card-name">{song.title}</span>
            <span className="track-card-artist">{song.artist?.username || 'Unknown'}</span>
        </div>
    );
}

function TrackGrid({ songs, loading, limit, onSelect, currentSong }) {
    if (loading) {
        return Array.from({ length: limit }, (_, i) => (
            <div key={i} className="track-card placeholder-card loading-card">
                <div className="track-card-cover"><i className="bi bi-music-note-list" /></div>
                <span className="track-card-name">Loading...</span>
                <span className="track-card-artist">—</span>
            </div>
        ));
    }

    if (songs.length === 0) {
        return <p className="no-songs">No songs uploaded yet.</p>;
    }

    return songs.slice(0, limit).map(song => (
        <TrackCard
            key={song._id}
            song={song}
            onSelect={onSelect}
            isActive={currentSong?._id === song._id}
        />
    ));
}

export default function HomePage() {
    const navigate = useNavigate();
    const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('user') || 'null'));
    const isLoggedIn = !!user;

    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
    const avatarRef = useRef(null);

    const [activeView, setActiveView] = useState('home');
    const [songs, setSongs] = useState(() => {
        try { return JSON.parse(sessionStorage.getItem('mo_songs_cache') || '[]'); } catch { return []; }
    });
    const [loading, setLoading] = useState(() => !sessionStorage.getItem('mo_songs_cache'));

    const [currentSong, setCurrentSong] = useState(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const audioRef = useRef(null);

    const [isPlaying, setIsPlaying] = useState(false);
    const [isShuffle, setIsShuffle] = useState(false);
    const [isLoop, setIsLoop] = useState(false);
    const [isLiked, setIsLiked]       = useState(false);
    const [likeLoading, setLikeLoading] = useState(false);
    const [volume, setVolume] = useState(70);
    const [streamError, setStreamError] = useState(null);

    const [showUpload, setShowUpload] = useState(false);
    const [uploadFile, setUploadFile]       = useState(null);
    const [uploadCover, setUploadCover]     = useState(null);
    const [uploadCoverPreview, setUploadCoverPreview] = useState(null);
    const [uploadTitle, setUploadTitle]     = useState('');
    const [uploadGenre, setUploadGenre]     = useState('Other');
    const [uploadDuration, setUploadDuration] = useState(0);
    const [uploading, setUploading]         = useState(false);
    const [uploadError, setUploadError]     = useState(null);
    const fileInputRef  = useRef(null);
    const coverInputRef = useRef(null);

    const playlists = [];

    const navItems = user?.isAdmin
        ? [...NAV_ITEMS, { id: 'admin', icon: 'bi-shield-fill-check', label: 'Admin' }]
        : NAV_ITEMS;

    const topSongs = [...songs].sort((a, b) => b.plays - a.plays);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        setDropdownOpen(false);
    };

    const handleSwitchAccount = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    const handleSongSelect = (song) => {
        const audio = audioRef.current;
        setStreamError(null);
        if (currentSong?._id === song._id) {
            setIsPlaying(p => !p);
            return;
        }
        if (audio) {
            audio.pause();
            audio.src = `http://localhost:5000/api/songs/${song._id}/stream`;
            audio.volume = volume / 100;
            audio.load();
            audio.play().catch(() => {});
        }
        setCurrentSong(song);
        setCurrentTime(0);
        setDuration(song.duration || 0);
        setIsPlaying(true);
        const uid = user?._id || user?.id;
        setIsLiked(uid ? (song.likes || []).some(l => l.toString() === uid.toString()) : false);
        axios.post(`http://localhost:5000/api/songs/${song._id}/play`).catch(() => {});
    };

    const handlePlayerLike = async () => {
        if (!user || !currentSong || likeLoading) return;
        setLikeLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(
                `http://localhost:5000/api/songs/${currentSong._id}/like`, {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setIsLiked(res.data.isLiked);
        } catch { /* ignore */ }
        finally { setLikeLoading(false); }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!ALLOWED_AUDIO_TYPES.has(file.type)) {
            setUploadError('Unsupported audio format. Use MP3, WAV, OGG, FLAC, or AAC/M4A.');
            e.target.value = '';
            return;
        }
        setUploadFile(file);
        setUploadError(null);
        setUploadTitle(prev => prev || file.name.replace(/\.[^.]+$/, ''));
        const tempAudio = new Audio();
        const url = URL.createObjectURL(file);
        tempAudio.src = url;
        tempAudio.onloadedmetadata = () => {
            setUploadDuration(Math.round(tempAudio.duration));
            URL.revokeObjectURL(url);
        };
    };

    const handleCoverChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
            setUploadError('Unsupported image format. Use JPEG, PNG, or GIF.');
            e.target.value = '';
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            setUploadError('Cover art must be under 10 MB.');
            e.target.value = '';
            return;
        }
        if (uploadCoverPreview) URL.revokeObjectURL(uploadCoverPreview);
        setUploadCover(file);
        setUploadCoverPreview(URL.createObjectURL(file));
        setUploadError(null);
    };

    const handleUpload = async () => {
        if (!uploadFile || !uploadTitle || !uploadDuration) return;
        setUploading(true);
        setUploadError(null);
        const formData = new FormData();
        formData.append('audio', uploadFile);
        formData.append('title', uploadTitle);
        formData.append('genre', uploadGenre);
        formData.append('duration', uploadDuration);
        if (uploadCover) formData.append('cover', uploadCover);
        try {
            const token = localStorage.getItem('token');
            await axios.post('http://localhost:5000/api/songs/upload', formData, {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            const res = await axios.get('http://localhost:5000/api/songs');
            setSongs(res.data);
            setShowUpload(false);
            setUploadFile(null);
            setUploadCover(null);
            if (uploadCoverPreview) URL.revokeObjectURL(uploadCoverPreview);
            setUploadCoverPreview(null);
            setUploadTitle('');
            setUploadGenre('Other');
            setUploadDuration(0);
        } catch (err) {
            setUploadError(err.response?.data?.message || 'Upload failed');
        } finally {
            setUploading(false);
        }
    };

    const closeUploadModal = () => {
        if (uploading) return;
        setShowUpload(false);
        setUploadFile(null);
        setUploadCover(null);
        if (uploadCoverPreview) URL.revokeObjectURL(uploadCoverPreview);
        setUploadCoverPreview(null);
        setUploadTitle('');
        setUploadGenre('Other');
        setUploadDuration(0);
        setUploadError(null);
    };

    // Close avatar dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (avatarRef.current && !avatarRef.current.contains(e.target)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Play / pause toggle
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio || !currentSong) return;
        if (isPlaying) {
            audio.play().catch(() => setIsPlaying(false));
        } else {
            audio.pause();
        }
    }, [isPlaying]); // eslint-disable-line react-hooks/exhaustive-deps

    // Volume
    useEffect(() => {
        if (audioRef.current) audioRef.current.volume = volume / 100;
    }, [volume]);

    // Loop
    useEffect(() => {
        if (audioRef.current) audioRef.current.loop = isLoop;
    }, [isLoop]);

    // Fetch songs — always refresh in background; cache makes it instant on remount
    useEffect(() => {
        axios.get('http://localhost:5000/api/songs')
            .then(res => {
                setSongs(res.data);
                try { sessionStorage.setItem('mo_songs_cache', JSON.stringify(res.data)); } catch { /* ignore */ }
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className={`homepage${currentSong ? ' has-player' : ''}`}>

            <audio
                ref={audioRef}
                onTimeUpdate={(e) => setCurrentTime(e.target.currentTime)}
                onLoadedMetadata={(e) => setDuration(e.target.duration)}
                onEnded={() => {
                    setIsPlaying(false);
                    setCurrentTime(0);
                }}
                onError={(e) => {
                    const code = e.target.error?.code;
                    // code 4 = MEDIA_ERR_SRC_NOT_SUPPORTED — server returned non-audio or 404
                    const msg = code === 4
                        ? 'No audio file found for this song'
                        : 'Could not load audio';
                    setStreamError(msg);
                    setIsPlaying(false);
                    console.error('Audio element error code:', code, e.target.error);
                }}
            />

            <aside className="left-nav">
                <div className="nav-brand">
                    <div className="nav-logo">
                        <i className="bi bi-music-note-beamed" />
                    </div>
                    <div className="nav-brand-text">
                        <span className="nav-app-name">MusicOverflow</span>
                        <span className="nav-version">v0.1.0-dev</span>
                    </div>
                </div>

                <nav className="nav-links">
                    {navItems.map(item => (
                        <button
                            key={item.id}
                            className={`nav-item ${activeView === item.id ? 'active' : ''}`}
                            onClick={() => {
                                if (item.id === 'profile') {
                                    if (user) navigate(`/profile/${user._id || user.id}`);
                                    else navigate('/login');
                                } else if (item.id === 'admin') {
                                    navigate('/admin');
                                } else {
                                    setActiveView(item.id);
                                }
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
                    {playlists.length === 0
                        ? <p className="playlists-empty">No playlists yet</p>
                        : playlists.map((pl, i) => (
                            <button key={i} className="playlist-item">{pl.name}</button>
                        ))
                    }
                </div>
            </aside>

            <header className="top-navbar">
                <div className="search-wrap">
                    <i className="bi bi-search search-icon" />
                    <input
                        className="search-input"
                        type="text"
                        placeholder="Search tracks, artists, playlists..."
                    />
                </div>
                <div className="navbar-right">
                    {isLoggedIn ? (
                        <>
                            <button className="upload-btn" onClick={() => setShowUpload(true)}>
                                <i className="bi bi-cloud-upload" />
                                Upload
                            </button>
                            <div className="avatar-wrapper" ref={avatarRef}>
                                <div
                                    className="avatar"
                                    onClick={() => setDropdownOpen(o => !o)}
                                >
                                    <div className="avatar-pic">
                                        {!avatarLoadFailed ? (
                                            <img
                                                src={`http://localhost:5000/api/users/${user._id || user.id}/profile-picture`}
                                                alt="avatar"
                                                onError={() => setAvatarLoadFailed(true)}
                                            />
                                        ) : (
                                            <i className="bi bi-person-fill" />
                                        )}
                                    </div>
                                    <span className="avatar-username">{user.username}</span>
                                </div>
                                {dropdownOpen && (
                                    <div className="avatar-dropdown">
                                        <button className="avatar-dropdown-item" onClick={handleLogout}>
                                            <i className="bi bi-box-arrow-right" />
                                            Logout
                                        </button>
                                        <button className="avatar-dropdown-item" onClick={handleSwitchAccount}>
                                            <i className="bi bi-arrow-left-right" />
                                            Switch Account
                                        </button>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <button className="login-btn" onClick={() => navigate('/login')}>
                            <i className="bi bi-box-arrow-in-right" />
                            Login
                        </button>
                    )}
                </div>
            </header>

            <main className="main-window">
                <div className="view-home" style={{ display: activeView === 'home' ? '' : 'none' }}>
                        <h2 className="view-greeting">
                            {getGreeting()}{isLoggedIn ? `, ${user.username}` : ''}
                        </h2>
                        <p className="view-sub">What are we listening to tonight?</p>

                        <section className="content-section">
                            <h3 className="section-title">Recent Uploads</h3>
                            <div className="track-grid">
                                <TrackGrid
                                    songs={songs}
                                    loading={loading}
                                    limit={6}
                                    onSelect={handleSongSelect}
                                    currentSong={currentSong}
                                />
                            </div>
                        </section>

                        <section className="content-section">
                            <h3 className="section-title">Most Played</h3>
                            <div className="track-grid">
                                <TrackGrid
                                    songs={topSongs}
                                    loading={loading}
                                    limit={4}
                                    onSelect={handleSongSelect}
                                    currentSong={currentSong}
                                />
                            </div>
                        </section>
                </div>

                <div className="view-placeholder" style={{ display: activeView !== 'home' ? '' : 'none' }}>
                    <i className={`bi ${navItems.find(n => n.id === activeView)?.icon || ''}`} />
                    <h2>{navItems.find(n => n.id === activeView)?.label || ''}</h2>
                    <p>Coming soon</p>
                </div>
            </main>

            {currentSong && (
                <footer className="bottom-player">
                    <div className="player-left">
                        <div className="player-cover">
                            <img
                                src={currentSong.coverArtId
                                    ? `${COVER_BASE}/${currentSong._id}/cover`
                                    : '/PK_SYGNET_RGB.jpg'}
                                alt={currentSong.title}
                            />
                        </div>
                        <div className="player-meta">
                            <span
                                className="player-title player-title-link"
                                onClick={() => navigate(`/song/${currentSong._id}`)}
                            >{currentSong.title}</span>
                            {streamError
                                ? <span className="player-stream-error"><i className="bi bi-exclamation-circle" /> {streamError}</span>
                                : <span className="player-artist">{currentSong.artist?.username || 'Unknown'}</span>
                            }
                        </div>
                        <button
                            className={`player-like ${isLiked ? 'liked' : ''}`}
                            onClick={handlePlayerLike}
                            disabled={likeLoading}
                        >
                            <i className={`bi ${isLiked ? 'bi-heart-fill' : 'bi-heart'}`} />
                        </button>
                    </div>

                    <div className="player-center">
                        <div className="player-controls">
                            <button
                                className={`ctrl-btn ${isShuffle ? 'active' : ''}`}
                                onClick={() => setIsShuffle(!isShuffle)}
                                title="Shuffle"
                            >
                                <i className="bi bi-shuffle" />
                            </button>
                            <button className="ctrl-btn" title="Previous">
                                <i className="bi bi-skip-start-fill" />
                            </button>
                            <button
                                className="ctrl-btn play-btn"
                                onClick={() => setIsPlaying(p => !p)}
                                title={isPlaying ? 'Pause' : 'Play'}
                            >
                                <i className={`bi ${isPlaying ? 'bi-pause-fill' : 'bi-play-fill'}`} />
                            </button>
                            <button className="ctrl-btn" title="Next">
                                <i className="bi bi-skip-end-fill" />
                            </button>
                            <button
                                className={`ctrl-btn ${isLoop ? 'active' : ''}`}
                                onClick={() => setIsLoop(!isLoop)}
                                title="Loop"
                            >
                                <i className="bi bi-repeat" />
                            </button>
                        </div>

                        <div className="player-progress-row">
                            <span className="player-time">{formatTime(currentTime)}</span>
                            <input
                                type="range"
                                className="progress-slider"
                                min="0"
                                max={duration || 0}
                                step="0.1"
                                value={currentTime}
                                onChange={(e) => {
                                    const t = Number(e.target.value);
                                    setCurrentTime(t);
                                    if (audioRef.current) audioRef.current.currentTime = t;
                                }}
                            />
                            <span className="player-time">{formatTime(duration)}</span>
                        </div>
                    </div>

                    <div className="player-right">
                        <i className={`bi ${getVolumeIcon(volume)}`} />
                        <input
                            type="range"
                            className="volume-slider"
                            min="0"
                            max="100"
                            value={volume}
                            onChange={(e) => setVolume(Number(e.target.value))}
                        />
                    </div>
                </footer>
            )}

            {showUpload && (
                <div className="upload-overlay" onClick={closeUploadModal}>
                    <div className="upload-modal" onClick={e => e.stopPropagation()}>

                        <div className="upload-modal-header">
                            <h2 className="upload-modal-title">Upload Track</h2>
                            <button className="upload-modal-close" onClick={closeUploadModal}>
                                <i className="bi bi-x-lg" />
                            </button>
                        </div>

                        {/* hidden inputs */}
                        <input ref={fileInputRef}  type="file" accept={AUDIO_ACCEPT} style={{ display: 'none' }} onChange={handleFileChange} />
                        <input ref={coverInputRef} type="file" accept={IMAGE_ACCEPT} style={{ display: 'none' }} onChange={handleCoverChange} />

                        <div className="upload-row">
                            {/* Cover art picker */}
                            <div
                                className={`cover-picker ${uploadCoverPreview ? 'has-cover' : ''}`}
                                onClick={() => coverInputRef.current.click()}
                                title="Click to pick cover art"
                            >
                                {uploadCoverPreview
                                    ? <img src={uploadCoverPreview} alt="Cover preview" />
                                    : <>
                                        <i className="bi bi-image" />
                                        <span>Cover Art</span>
                                        <span className="cover-picker-hint">optional · 10 MB</span>
                                      </>
                                }
                                {uploadCoverPreview && (
                                    <div className="cover-picker-overlay">
                                        <i className="bi bi-pencil" />
                                    </div>
                                )}
                            </div>

                            {/* Right column */}
                            <div className="upload-col">
                                <div
                                    className={`upload-dropzone ${uploadFile ? 'has-file' : ''}`}
                                    onClick={() => fileInputRef.current.click()}
                                >
                                    <i className={`bi ${uploadFile ? 'bi-file-music-fill' : 'bi-cloud-arrow-up'}`} />
                                    {uploadFile
                                        ? <span className="upload-filename">{uploadFile.name}</span>
                                        : <>
                                            <span>Click to select audio</span>
                                            <span className="upload-hint">MP3, WAV, FLAC · max 100 MB</span>
                                          </>
                                    }
                                </div>

                                <input
                                    className="upload-field"
                                    type="text"
                                    placeholder="Track title"
                                    value={uploadTitle}
                                    onChange={e => setUploadTitle(e.target.value)}
                                />

                                <select
                                    className="upload-field upload-select"
                                    value={uploadGenre}
                                    onChange={e => setUploadGenre(e.target.value)}
                                >
                                    {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                                </select>
                            </div>
                        </div>

                        {uploadError && (
                            <p className="upload-error">
                                <i className="bi bi-exclamation-circle" /> {uploadError}
                            </p>
                        )}

                        <button
                            className="upload-submit"
                            onClick={handleUpload}
                            disabled={!uploadFile || !uploadTitle || uploading}
                        >
                            {uploading
                                ? <><i className="bi bi-arrow-repeat upload-spin" /> Uploading…</>
                                : <><i className="bi bi-cloud-upload" /> Upload Track</>
                            }
                        </button>
                    </div>
                </div>
            )}

        </div>
    );
}
