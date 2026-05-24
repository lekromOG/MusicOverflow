import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import 'bootstrap-icons/font/bootstrap-icons.css';
import { profileAPI } from '../services/api';
import './ProfilePage.css';

const API_BASE = 'http://localhost:5000/api';
const COVER_BASE = `${API_BASE}/songs`;

const NAV_ITEMS = [
    { id: 'home',     icon: 'bi-house-fill',      label: 'Home'     },
    { id: 'library',  icon: 'bi-collection-fill',  label: 'Library'  },
    { id: 'profile',  icon: 'bi-person-fill',      label: 'Profile'  },
    { id: 'settings', icon: 'bi-gear-fill',        label: 'Settings' },
];

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif']);

function formatDuration(secs) {
    if (!secs || isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatNumber(n) {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return String(n || 0);
}

function formatDate(dateStr) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
}

function getVolumeIcon(volume) {
    if (volume === 0) return 'bi-volume-mute-fill';
    if (volume < 50)  return 'bi-volume-down-fill';
    return 'bi-volume-up-fill';
}

function TrackRow({ song, onSelect, isActive, isPlaying }) {
    const coverUrl = song.coverArtId
        ? `${COVER_BASE}/${song._id}/cover`
        : '/PK_SYGNET_RGB.jpg';

    return (
        <div
            className={`profile-track-row${isActive ? ' profile-track-row-active' : ''}`}
            onClick={() => onSelect(song)}
        >
            <div className="profile-track-cover-wrap">
                <img className="profile-track-cover" src={coverUrl} alt={song.title} />
                <div className="profile-track-play-btn">
                    <i className={`bi ${isActive && isPlaying ? 'bi-pause-fill' : 'bi-play-fill'}`} />
                </div>
            </div>
            <div className="profile-track-info">
                <span className={`profile-track-title${isActive ? ' profile-track-title-active' : ''}`}>
                    {song.title}
                </span>
                <span className="profile-track-artist">{song.artist?.username || 'Unknown'}</span>
            </div>
            {song.genre && (
                <span className="profile-track-genre">{song.genre}</span>
            )}
            <span className="profile-track-plays">
                <i className="bi bi-play-fill" /> {formatNumber(song.plays)}
            </span>
            <span className="profile-track-duration">{formatDuration(song.duration)}</span>
        </div>
    );
}

function PlaylistCard({ playlist }) {
    return (
        <div className="profile-playlist-card">
            <div className="profile-playlist-cover">
                <i className="bi bi-music-note-list" />
            </div>
            <span className="profile-playlist-name">{playlist.name}</span>
            <span className="profile-playlist-count">
                {playlist.songs?.length || 0} tracks
            </span>
        </div>
    );
}

function EmptyState({ icon, message }) {
    return (
        <div className="profile-empty-state">
            <i className={`bi ${icon}`} />
            <p>{message}</p>
        </div>
    );
}

export default function ProfilePage() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [loggedInUser, setLoggedInUser] = useState(
        () => JSON.parse(localStorage.getItem('user') || 'null')
    );
    const isOwner = (loggedInUser?._id || loggedInUser?.id)?.toString() === id;

    // Profile data
    const [profile, setProfile]     = useState(null);
    const [songs, setSongs]         = useState([]);
    const [playlists, setPlaylists] = useState([]);
    const [reposts, setReposts]     = useState([]);
    const [loading, setLoading]     = useState(true);
    const [error, setError]         = useState(null);
    const [activeTab, setActiveTab] = useState('tracks');

    // Player state
    const audioRef                          = useRef(null);
    const [currentSong, setCurrentSong]     = useState(null);
    const [isPlaying, setIsPlaying]         = useState(false);
    const [currentTime, setCurrentTime]     = useState(0);
    const [duration, setDuration]           = useState(0);
    const [volume, setVolume]               = useState(70);
    const [isShuffle, setIsShuffle]         = useState(false);
    const [isLoop, setIsLoop]               = useState(false);
    const [isLiked, setIsLiked]             = useState(false);
    const [likeLoading, setLikeLoading]     = useState(false);
    const [streamError, setStreamError]     = useState(null);

    // Edit profile state
    const [showEdit, setShowEdit]       = useState(false);
    const [editUsername, setEditUsername] = useState('');
    const [editBio, setEditBio]         = useState('');
    const [editSaving, setEditSaving]   = useState(false);
    const [editError, setEditError]     = useState(null);

    // Image upload state
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [uploadingBanner, setUploadingBanner] = useState(false);
    const [imageError, setImageError]           = useState(null);
    const avatarInputRef = useRef(null);
    const bannerInputRef = useRef(null);
    const [avatarKey, setAvatarKey] = useState(0);
    const [bannerKey, setBannerKey] = useState(0);

    const navItems = loggedInUser?.isAdmin
        ? [...NAV_ITEMS, { id: 'admin', icon: 'bi-shield-fill-check', label: 'Admin' }]
        : NAV_ITEMS;

    const totalPlays = songs.reduce((acc, s) => acc + (s.plays || 0), 0);

    // ── Fetch profile data ─────────────────────────────────────────────────
    useEffect(() => {
        setLoading(true);
        setError(null);
        Promise.all([
            profileAPI.getProfile(id),
            profileAPI.getUserSongs(id),
            profileAPI.getUserPlaylists(id),
            profileAPI.getUserReposts(id),
        ])
            .then(([profileRes, songsRes, playlistsRes, repostsRes]) => {
                setProfile(profileRes.data);
                setSongs(songsRes.data);
                setPlaylists(playlistsRes.data);
                setReposts(repostsRes.data);
            })
            .catch(() => setError('Failed to load profile'))
            .finally(() => setLoading(false));
    }, [id]);

    // ── Player effects ─────────────────────────────────────────────────────
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio || !currentSong) return;
        if (isPlaying) audio.play().catch(() => setIsPlaying(false));
        else audio.pause();
    }, [isPlaying]); // eslint-disable-line

    useEffect(() => {
        if (audioRef.current) audioRef.current.volume = volume / 100;
    }, [volume]);

    useEffect(() => {
        if (audioRef.current) audioRef.current.loop = isLoop;
    }, [isLoop]);

    // ── Player handlers ────────────────────────────────────────────────────
    const handleSongSelect = (song) => {
        setStreamError(null);
        if (currentSong?._id === song._id) {
            setIsPlaying(p => !p);
            return;
        }
        const audio = audioRef.current;
        if (audio) {
            audio.pause();
            audio.src = `${API_BASE}/songs/${song._id}/stream`;
            audio.volume = volume / 100;
            audio.load();
            audio.play().catch(() => {});
        }
        setCurrentSong(song);
        setCurrentTime(0);
        setDuration(song.duration || 0);
        setIsPlaying(true);
        const uid = loggedInUser?._id || loggedInUser?.id;
        setIsLiked(uid ? (song.likes || []).some(l => l.toString() === uid.toString()) : false);
        axios.post(`${API_BASE}/songs/${song._id}/play`).catch(() => {});
    };

    const handlePlayerLike = async () => {
        if (!loggedInUser || !currentSong || likeLoading) return;
        setLikeLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(
                `${API_BASE}/songs/${currentSong._id}/like`, {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setIsLiked(res.data.isLiked);
        } catch { /* ignore */ }
        finally { setLikeLoading(false); }
    };

    // ── Edit profile ───────────────────────────────────────────────────────
    const openEditModal = () => {
        setEditUsername(profile?.username || '');
        setEditBio(profile?.bio || '');
        setEditError(null);
        setShowEdit(true);
    };

    const handleSaveProfile = async () => {
        setEditSaving(true);
        setEditError(null);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.put(`${API_BASE}/users/${id}`, {
                username: editUsername,
                bio: editBio,
            }, { headers: { Authorization: `Bearer ${token}` } });
            setProfile(prev => ({ ...prev, ...res.data }));
            const updatedUser = { ...loggedInUser, username: res.data.username, bio: res.data.bio };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            setLoggedInUser(updatedUser);
            setShowEdit(false);
        } catch (err) {
            setEditError(err.response?.data?.error || 'Failed to save changes');
        } finally {
            setEditSaving(false);
        }
    };

    // ── Image uploads ──────────────────────────────────────────────────────
    const handleAvatarChange = async (e) => {
        const file = e.target.files[0];
        e.target.value = '';
        if (!file) return;
        if (!ALLOWED_IMAGE_TYPES.has(file.type)) { setImageError('Image must be JPEG, PNG, or GIF'); return; }
        if (file.size > 10 * 1024 * 1024)        { setImageError('Image must be under 10 MB'); return; }
        setUploadingAvatar(true);
        setImageError(null);
        const formData = new FormData();
        formData.append('image', file);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`${API_BASE}/users/${id}/profile-picture`, formData, {
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
            });
            setProfile(prev => ({ ...prev, profilePictureId: res.data.profilePictureId }));
            setAvatarKey(k => k + 1);
            if (isOwner) {
                const updatedUser = { ...loggedInUser, profilePictureId: res.data.profilePictureId };
                localStorage.setItem('user', JSON.stringify(updatedUser));
                setLoggedInUser(updatedUser);
            }
        } catch (err) {
            setImageError(err.response?.data?.error || 'Failed to upload picture');
        } finally {
            setUploadingAvatar(false);
        }
    };

    const handleBannerChange = async (e) => {
        const file = e.target.files[0];
        e.target.value = '';
        if (!file) return;
        if (!ALLOWED_IMAGE_TYPES.has(file.type)) { setImageError('Image must be JPEG, PNG, or GIF'); return; }
        if (file.size > 10 * 1024 * 1024)        { setImageError('Image must be under 10 MB'); return; }
        setUploadingBanner(true);
        setImageError(null);
        const formData = new FormData();
        formData.append('image', file);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`${API_BASE}/users/${id}/banner`, formData, {
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
            });
            setProfile(prev => ({ ...prev, bannerImageId: res.data.bannerImageId }));
            setBannerKey(k => k + 1);
        } catch (err) {
            setImageError(err.response?.data?.error || 'Failed to upload banner');
        } finally {
            setUploadingBanner(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    // ── Loading / error screens ────────────────────────────────────────────
    if (loading) {
        return (
            <div className="profile-page-wrapper">
                <aside className="left-nav">
                    <div className="nav-brand">
                        <div className="nav-logo"><i className="bi bi-music-note-beamed" /></div>
                        <div className="nav-brand-text">
                            <span className="nav-app-name">MusicOverflow</span>
                            <span className="nav-version">v0.1.0-dev</span>
                        </div>
                    </div>
                </aside>
                <main className="profile-main">
                    <div className="profile-loading">
                        <i className="bi bi-arrow-repeat profile-loading-spin" />
                        <p>Loading profile…</p>
                    </div>
                </main>
            </div>
        );
    }

    if (error || !profile) {
        return (
            <div className="profile-page-wrapper">
                <aside className="left-nav">
                    <div className="nav-brand">
                        <div className="nav-logo"><i className="bi bi-music-note-beamed" /></div>
                        <div className="nav-brand-text">
                            <span className="nav-app-name">MusicOverflow</span>
                            <span className="nav-version">v0.1.0-dev</span>
                        </div>
                    </div>
                </aside>
                <main className="profile-main">
                    <div className="profile-loading">
                        <i className="bi bi-person-x" style={{ fontSize: 48, marginBottom: 12 }} />
                        <p>{error || 'User not found'}</p>
                        <button className="profile-back-btn" onClick={() => navigate('/')}>
                            <i className="bi bi-arrow-left" /> Back to Home
                        </button>
                    </div>
                </main>
            </div>
        );
    }

    const avatarUrl = profile.profilePictureId
        ? `${API_BASE}/users/${id}/profile-picture?v=${avatarKey}`
        : null;

    const bannerUrl = profile.bannerImageId
        ? `${API_BASE}/users/${id}/banner?v=${bannerKey}`
        : null;

    const playerCoverUrl = currentSong?.coverArtId
        ? `${COVER_BASE}/${currentSong._id}/cover`
        : '/PK_SYGNET_RGB.jpg';

    return (
        <div className={`profile-page-wrapper${currentSong ? ' profile-has-player' : ''}`}>

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

            {/* Hidden file inputs */}
            <input ref={avatarInputRef} type="file" accept=".jpg,.jpeg,.png,.gif"
                style={{ display: 'none' }} onChange={handleAvatarChange} />
            <input ref={bannerInputRef} type="file" accept=".jpg,.jpeg,.png,.gif"
                style={{ display: 'none' }} onChange={handleBannerChange} />

            {/* Sidebar */}
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
                            className={`nav-item ${item.id === 'profile' ? 'active' : ''}`}
                            onClick={() => {
                                if (item.id === 'home') navigate('/');
                                else if (item.id === 'admin') navigate('/admin');
                                else if (item.id === 'profile') {
                                    const uid = loggedInUser?._id || loggedInUser?.id || id;
                                    navigate(`/profile/${uid}`);
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

            {/* Main content */}
            <main className="profile-main">

                {/* Banner */}
                <div className="profile-banner">
                    {bannerUrl
                        ? <img key={bannerKey} src={bannerUrl} alt="Profile banner" className="profile-banner-img" />
                        : <div className="profile-banner-default" />
                    }
                    {isOwner && (
                        <button className="banner-change-btn"
                            onClick={() => bannerInputRef.current.click()}
                            disabled={uploadingBanner}
                        >
                            {uploadingBanner
                                ? <i className="bi bi-arrow-repeat banner-spin" />
                                : <i className="bi bi-camera-fill" />
                            }
                            <span>{uploadingBanner ? 'Uploading…' : 'Change Banner'}</span>
                        </button>
                    )}
                </div>

                {/* Profile info bar */}
                <div className="profile-info-bar">
                    <div className="profile-avatar-wrap">
                        <div
                            className={`profile-avatar ${isOwner ? 'profile-avatar-editable' : ''}`}
                            onClick={isOwner ? () => avatarInputRef.current.click() : undefined}
                        >
                            {uploadingAvatar ? (
                                <div className="profile-avatar-loading">
                                    <i className="bi bi-arrow-repeat profile-loading-spin" />
                                </div>
                            ) : avatarUrl ? (
                                <img key={avatarKey} src={avatarUrl} alt={profile.username} />
                            ) : (
                                <div className="profile-avatar-placeholder">
                                    <i className="bi bi-person-fill" />
                                </div>
                            )}
                            {isOwner && !uploadingAvatar && (
                                <div className="profile-avatar-overlay">
                                    <i className="bi bi-camera-fill" />
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="profile-meta">
                        <h1 className="profile-username">{profile.username}</h1>
                        <div className="profile-stats-row">
                            <div className="profile-stat">
                                <span className="profile-stat-value">{formatNumber(songs.length)}</span>
                                <span className="profile-stat-label">Tracks</span>
                            </div>
                            <div className="profile-stat-divider" />
                            <div className="profile-stat">
                                <span className="profile-stat-value">{formatNumber(profile.followers?.length || 0)}</span>
                                <span className="profile-stat-label">Followers</span>
                            </div>
                            <div className="profile-stat-divider" />
                            <div className="profile-stat">
                                <span className="profile-stat-value">{formatNumber(profile.following?.length || 0)}</span>
                                <span className="profile-stat-label">Following</span>
                            </div>
                            <div className="profile-stat-divider" />
                            <div className="profile-stat">
                                <span className="profile-stat-value">{formatNumber(totalPlays)}</span>
                                <span className="profile-stat-label">Total Plays</span>
                            </div>
                        </div>
                    </div>

                    <div className="profile-action">
                        {isOwner ? (
                            <button className="profile-edit-btn" onClick={openEditModal}>
                                <i className="bi bi-pencil-fill" /> Edit Profile
                            </button>
                        ) : (
                            <button className="profile-follow-btn">
                                <i className="bi bi-person-plus-fill" /> Follow
                            </button>
                        )}
                    </div>
                </div>

                {imageError && (
                    <div className="profile-image-error">
                        <i className="bi bi-exclamation-circle" /> {imageError}
                        <button onClick={() => setImageError(null)}><i className="bi bi-x" /></button>
                    </div>
                )}

                {/* Tabs */}
                <div className="profile-tabs">
                    {[
                        { id: 'tracks',    label: 'Tracks'    },
                        { id: 'playlists', label: 'Playlists' },
                        { id: 'reposts',   label: 'Reposts'   },
                        { id: 'about',     label: 'About'     },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            className={`profile-tab ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Tab content */}
                <div className="profile-content">
                    {activeTab === 'tracks' && (
                        <div className="profile-tracks-list">
                            {songs.length === 0
                                ? <EmptyState icon="bi-music-note" message="No tracks uploaded yet." />
                                : songs.map(song => (
                                    <TrackRow
                                        key={song._id}
                                        song={song}
                                        onSelect={handleSongSelect}
                                        isActive={currentSong?._id === song._id}
                                        isPlaying={isPlaying}
                                    />
                                ))
                            }
                        </div>
                    )}

                    {activeTab === 'playlists' && (
                        <div className="profile-playlists-grid">
                            {playlists.length === 0
                                ? <EmptyState icon="bi-collection" message="No playlists yet." />
                                : playlists.map(pl => <PlaylistCard key={pl._id} playlist={pl} />)
                            }
                        </div>
                    )}

                    {activeTab === 'reposts' && (
                        <div className="profile-tracks-list">
                            {reposts.length === 0
                                ? <EmptyState icon="bi-repeat" message="No reposts yet." />
                                : reposts.map(song => (
                                    <TrackRow
                                        key={song._id}
                                        song={song}
                                        onSelect={handleSongSelect}
                                        isActive={currentSong?._id === song._id}
                                        isPlaying={isPlaying}
                                    />
                                ))
                            }
                        </div>
                    )}

                    {activeTab === 'about' && (
                        <div className="profile-about">
                            <div className="about-bio-section">
                                <h3 className="about-section-title">Bio</h3>
                                {profile.bio
                                    ? <p className="about-bio-text">{profile.bio}</p>
                                    : <p className="about-bio-empty">
                                        {isOwner ? "You haven't added a bio yet. Click Edit Profile to add one." : 'No bio yet.'}
                                      </p>
                                }
                            </div>
                            <div className="about-stats-section">
                                <h3 className="about-section-title">Stats</h3>
                                <div className="about-stats-grid">
                                    <div className="about-stat-item">
                                        <i className="bi bi-music-note-list" />
                                        <span className="about-stat-value">{songs.length}</span>
                                        <span className="about-stat-label">Tracks</span>
                                    </div>
                                    <div className="about-stat-item">
                                        <i className="bi bi-play-circle" />
                                        <span className="about-stat-value">{formatNumber(totalPlays)}</span>
                                        <span className="about-stat-label">Total Plays</span>
                                    </div>
                                    <div className="about-stat-item">
                                        <i className="bi bi-people-fill" />
                                        <span className="about-stat-value">{profile.followers?.length || 0}</span>
                                        <span className="about-stat-label">Followers</span>
                                    </div>
                                    <div className="about-stat-item">
                                        <i className="bi bi-person-check-fill" />
                                        <span className="about-stat-value">{profile.following?.length || 0}</span>
                                        <span className="about-stat-label">Following</span>
                                    </div>
                                </div>
                            </div>
                            <div className="about-joined-section">
                                <h3 className="about-section-title">Member Since</h3>
                                <p className="about-joined-date">
                                    <i className="bi bi-calendar3" /> {formatDate(profile.createdAt)}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* ── Bottom player ─────────────────────────────────────────── */}
            {currentSong && (
                <footer className="profile-player">
                    <div className="player-left">
                        <div className="player-cover">
                            <img src={playerCoverUrl} alt={currentSong.title} />
                        </div>
                        <div className="player-meta">
                            <span
                                className="player-title player-title-link"
                                onClick={() => navigate(`/song/${currentSong._id}`)}
                            >{currentSong.title}</span>
                            {streamError
                                ? <span className="player-stream-error">
                                    <i className="bi bi-exclamation-circle" /> {streamError}
                                  </span>
                                : <span className="player-artist">{currentSong.artist?.username || 'Unknown'}</span>
                            }
                        </div>
                        <button
                            className={`player-like${isLiked ? ' liked' : ''}`}
                            onClick={handlePlayerLike}
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
                            <button className="ctrl-btn play-btn"
                                onClick={() => setIsPlaying(p => !p)}
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

            {/* ── Edit Profile Modal ─────────────────────────────────────── */}
            {showEdit && (
                <div className="edit-modal-overlay" onClick={() => !editSaving && setShowEdit(false)}>
                    <div className="edit-modal" onClick={e => e.stopPropagation()}>
                        <div className="edit-modal-header">
                            <h2>Edit Profile</h2>
                            <button className="edit-modal-close"
                                onClick={() => setShowEdit(false)} disabled={editSaving}>
                                <i className="bi bi-x-lg" />
                            </button>
                        </div>
                        <div className="edit-modal-body">
                            <label className="edit-label">Username</label>
                            <input className="edit-input" type="text"
                                value={editUsername} onChange={e => setEditUsername(e.target.value)}
                                placeholder="Username" maxLength={30} />
                            <label className="edit-label">Bio</label>
                            <textarea className="edit-textarea"
                                value={editBio} onChange={e => setEditBio(e.target.value)}
                                placeholder="Tell people about yourself…" rows={4} maxLength={300} />
                            <span className="edit-char-count">{editBio.length}/300</span>
                        </div>
                        {editError && (
                            <p className="edit-error">
                                <i className="bi bi-exclamation-circle" /> {editError}
                            </p>
                        )}
                        <div className="edit-modal-footer">
                            <button className="edit-cancel-btn"
                                onClick={() => setShowEdit(false)} disabled={editSaving}>
                                Cancel
                            </button>
                            <button className="edit-save-btn"
                                onClick={handleSaveProfile}
                                disabled={editSaving || !editUsername.trim()}>
                                {editSaving
                                    ? <><i className="bi bi-arrow-repeat edit-spin" /> Saving…</>
                                    : 'Save Changes'
                                }
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
