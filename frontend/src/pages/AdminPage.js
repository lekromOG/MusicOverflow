import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './AdminPage.css';

const API = 'http://localhost:5000/api';

const TABS = [
    { id: 'overview', icon: 'bi-speedometer2',      label: 'Overview'          },
    { id: 'reports',  icon: 'bi-flag-fill',          label: 'Reports Queue'     },
    { id: 'users',    icon: 'bi-people-fill',        label: 'Users'             },
    { id: 'removed',  icon: 'bi-chat-x-fill',        label: 'Removed Comments'  },
    { id: 'modlog',   icon: 'bi-journal-text',       label: 'Moderation Log'    },
];

const NAV_ITEMS = [
    { id: 'home',     icon: 'bi-house-fill',      label: 'Home'     },
    { id: 'library',  icon: 'bi-collection-fill',  label: 'Library'  },
    { id: 'profile',  icon: 'bi-person-fill',      label: 'Profile'  },
    { id: 'settings', icon: 'bi-gear-fill',        label: 'Settings' },
];

function formatDate(dateStr) {
    if (!dateStr) return '—';
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

function StatusBadge({ banned, banExpiresAt }) {
    if (!banned) return <span className="status-badge status-active">Active</span>;
    if (!banExpiresAt) return <span className="status-badge status-banned">Banned Permanently</span>;
    return (
        <span className="status-badge status-banned">
            Banned until {new Date(banExpiresAt).toLocaleDateString()}
        </span>
    );
}

function ActionBadge({ action }) {
    const cls = { ban: 'red', unban: 'green', mute: 'orange', warning: 'yellow', content_removed: 'purple' };
    const label = {
        ban: 'Ban', unban: 'Unban', mute: 'Mute',
        warning: 'Warning', content_removed: 'Content Removed',
    };
    return <span className={`action-badge action-${cls[action] || 'gray'}`}>{label[action] || action}</span>;
}

function AvatarImg({ src }) {
    const [failed, setFailed] = useState(false);
    return failed ? (
        <div className="admin-avatar-fallback"><i className="bi bi-person-fill" /></div>
    ) : (
        <img className="admin-avatar-img" src={src} alt="" onError={() => setFailed(true)} />
    );
}

function Spinner() {
    return <div className="admin-loading"><i className="bi bi-arrow-repeat admin-spin" /> Loading…</div>;
}

export default function AdminPage() {
    const navigate = useNavigate();
    const [loggedInUser] = useState(() => JSON.parse(localStorage.getItem('user') || 'null'));
    const loggedInUserId = loggedInUser?._id || loggedInUser?.id;
    const authHeader = { Authorization: `Bearer ${localStorage.getItem('token')}` };

    const [activeTab, setActiveTab] = useState('overview');
    const loadedTabs = useRef(new Set());

    // ── Overview ───────────────────────────────────────────────────────────────
    const [overview, setOverview]               = useState(null);
    const [overviewLoading, setOverviewLoading] = useState(false);

    // ── Reports ────────────────────────────────────────────────────────────────
    const [reports, setReports]               = useState([]);
    const [reportsLoading, setReportsLoading] = useState(false);

    // ── Users ──────────────────────────────────────────────────────────────────
    const [users, setUsers]               = useState([]);
    const [usersLoading, setUsersLoading] = useState(false);
    const [userSearch, setUserSearch]     = useState('');
    const [banModal, setBanModal]         = useState(null); // { userId, username }
    const [banReason, setBanReason]       = useState('');
    const [banDuration, setBanDuration]   = useState('permanent');
    const [banLoading, setBanLoading]     = useState(false);
    const searchTimer = useRef(null);

    // ── Removed comments ───────────────────────────────────────────────────────
    const [removed, setRemoved]               = useState([]);
    const [removedLoading, setRemovedLoading] = useState(false);

    // ── Mod log ────────────────────────────────────────────────────────────────
    const [modLog, setModLog]               = useState([]);
    const [modLogLoading, setModLogLoading] = useState(false);

    // Redirect non-admins immediately
    useEffect(() => {
        if (!loggedInUser?.isAdmin) navigate('/');
    }, []); // eslint-disable-line

    // ── Fetch helpers ──────────────────────────────────────────────────────────
    const fetchOverview = async () => {
        setOverviewLoading(true);
        try {
            const res = await axios.get(`${API}/admin/overview`, { headers: authHeader });
            setOverview(res.data);
        } catch { /* ignore */ }
        finally { setOverviewLoading(false); }
    };

    const fetchReports = async () => {
        setReportsLoading(true);
        try {
            const res = await axios.get(`${API}/admin/reports`, { headers: authHeader });
            setReports(res.data);
        } catch { /* ignore */ }
        finally { setReportsLoading(false); }
    };

    const fetchUsers = async (search = '') => {
        setUsersLoading(true);
        try {
            const res = await axios.get(`${API}/admin/users`, {
                headers: authHeader,
                params: { search },
            });
            setUsers(res.data);
        } catch { /* ignore */ }
        finally { setUsersLoading(false); }
    };

    const fetchRemoved = async () => {
        setRemovedLoading(true);
        try {
            const res = await axios.get(`${API}/admin/removed-comments`, { headers: authHeader });
            setRemoved(res.data);
        } catch { /* ignore */ }
        finally { setRemovedLoading(false); }
    };

    const fetchModLog = async () => {
        setModLogLoading(true);
        try {
            const res = await axios.get(`${API}/admin/moderation-log`, { headers: authHeader });
            setModLog(res.data);
        } catch { /* ignore */ }
        finally { setModLogLoading(false); }
    };

    // Load on first visit to each tab
    useEffect(() => {
        if (loadedTabs.current.has(activeTab)) return;
        loadedTabs.current.add(activeTab);
        if (activeTab === 'overview') fetchOverview();
        if (activeTab === 'reports')  fetchReports();
        if (activeTab === 'users')    fetchUsers();
        if (activeTab === 'removed')  fetchRemoved();
        if (activeTab === 'modlog')   fetchModLog();
    }, [activeTab]); // eslint-disable-line

    // ── Report actions ─────────────────────────────────────────────────────────
    const handleResolveReport = async (reportId, action) => {
        try {
            await axios.patch(`${API}/admin/reports/${reportId}/resolve`, { action }, { headers: authHeader });
            setReports(prev => prev.filter(r => r._id !== reportId));
            loadedTabs.current.delete('overview');
        } catch { /* ignore */ }
    };

    // ── User actions ───────────────────────────────────────────────────────────
    const openBanModal = (userId, username) => {
        setBanModal({ userId, username });
        setBanReason('');
        setBanDuration('permanent');
    };

    const handleBanUser = async () => {
        if (!banModal || !banReason.trim() || banLoading) return;
        setBanLoading(true);
        const durationDays = banDuration === 'permanent' ? null : Number(banDuration);
        try {
            const res = await axios.post(
                `${API}/admin/users/${banModal.userId}/ban`,
                { reason: banReason.trim(), duration: durationDays },
                { headers: authHeader },
            );
            setUsers(prev => prev.map(u =>
                u._id === banModal.userId
                    ? { ...u, isBanned: true, banExpiresAt: res.data.banExpiresAt }
                    : u
            ));
            setBanModal(null);
            loadedTabs.current.delete('modlog');
            loadedTabs.current.delete('overview');
        } catch { /* ignore */ }
        finally { setBanLoading(false); }
    };

    const handleUnban = async (userId) => {
        try {
            await axios.post(`${API}/admin/users/${userId}/unban`, {}, { headers: authHeader });
            setUsers(prev => prev.map(u =>
                u._id === userId ? { ...u, isBanned: false, banExpiresAt: null } : u
            ));
            loadedTabs.current.delete('modlog');
            loadedTabs.current.delete('overview');
        } catch { /* ignore */ }
    };

    const handleSearchChange = val => {
        setUserSearch(val);
        clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(() => fetchUsers(val), 350);
    };

    // ── Removed comment actions ────────────────────────────────────────────────
    const handleRestore = async commentId => {
        try {
            await axios.patch(`${API}/admin/comments/${commentId}/restore`, {}, { headers: authHeader });
            setRemoved(prev => prev.filter(c => c._id !== commentId));
            loadedTabs.current.delete('overview');
        } catch { /* ignore */ }
    };

    const handleHardDelete = async commentId => {
        try {
            await axios.delete(`${API}/admin/comments/${commentId}`, { headers: authHeader });
            setRemoved(prev => prev.filter(c => c._id !== commentId));
        } catch { /* ignore */ }
    };

    // ── Logout ─────────────────────────────────────────────────────────────────
    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    // ── Sidebar ────────────────────────────────────────────────────────────────
    const navItems = [...NAV_ITEMS, { id: 'admin', icon: 'bi-shield-fill-check', label: 'Admin' }];

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
                        className={`nav-item${item.id === 'admin' ? ' active' : ''}`}
                        onClick={() => {
                            if (item.id === 'home')    navigate('/');
                            else if (item.id === 'admin') navigate('/admin');
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

    // ── Tab: Overview ──────────────────────────────────────────────────────────
    const renderOverview = () => {
        if (overviewLoading || !overview) return <Spinner />;
        const stats = [
            { label: 'Total Users',     value: overview.totalUsers,     icon: 'bi-people-fill',       color: 'blue'   },
            { label: 'Songs',           value: overview.totalSongs,     icon: 'bi-music-note-list',   color: 'green'  },
            { label: 'Comments',        value: overview.totalComments,  icon: 'bi-chat-fill',         color: 'purple' },
            { label: 'Pending Reports', value: overview.pendingReports, icon: 'bi-flag-fill',         color: 'yellow' },
            { label: 'Banned Users',    value: overview.bannedUsers,    icon: 'bi-slash-circle-fill', color: 'red'    },
        ];
        return (
            <>
                <div className="admin-stat-grid">
                    {stats.map(s => (
                        <div key={s.label} className={`admin-stat-card stat-${s.color}`}>
                            <i className={`bi ${s.icon}`} />
                            <div className="stat-value">{s.value ?? 0}</div>
                            <div className="stat-label">{s.label}</div>
                        </div>
                    ))}
                </div>

                <div className="admin-section">
                    <h3 className="admin-section-title">
                        <i className="bi bi-clock-history" /> Recent Actions
                    </h3>
                    {!overview.recentActions?.length ? (
                        <div className="admin-empty">No moderation actions yet.</div>
                    ) : (
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Action</th><th>Target</th><th>By</th><th>Reason</th><th>When</th>
                                </tr>
                            </thead>
                            <tbody>
                                {overview.recentActions.map(a => (
                                    <tr key={a._id}>
                                        <td><ActionBadge action={a.action} /></td>
                                        <td className="admin-username">{a.targetUser?.username || '—'}</td>
                                        <td className="muted">{a.moderatedBy?.username || '—'}</td>
                                        <td className="reason-cell">{a.reason}</td>
                                        <td className="date-cell">{formatDate(a.createdAt)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </>
        );
    };

    // ── Tab: Reports Queue ─────────────────────────────────────────────────────
    const renderReports = () => {
        if (reportsLoading) return <Spinner />;
        if (!reports.length) return (
            <div className="admin-empty-page">
                <i className="bi bi-flag" />
                <p>No pending reports</p>
            </div>
        );
        return (
            <table className="admin-table">
                <thead>
                    <tr>
                        <th>Reporter</th><th>Type</th><th>Reason</th><th>Date</th><th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {reports.map(r => (
                        <tr key={r._id}>
                            <td className="admin-username">{r.reporter?.username || 'Unknown'}</td>
                            <td><span className={`type-badge type-${r.targetType}`}>{r.targetType}</span></td>
                            <td className="reason-cell">{r.reason}</td>
                            <td className="date-cell">{formatDate(r.createdAt)}</td>
                            <td>
                                <div className="action-btns">
                                    <button className="adm-btn adm-btn-green"
                                        onClick={() => handleResolveReport(r._id, 'resolved')}>
                                        Resolve
                                    </button>
                                    <button className="adm-btn adm-btn-ghost"
                                        onClick={() => handleResolveReport(r._id, 'dismissed')}>
                                        Dismiss
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        );
    };

    // ── Tab: Users ─────────────────────────────────────────────────────────────
    const renderUsers = () => (
        <>
            <div className="admin-search-bar">
                <i className="bi bi-search" />
                <input
                    className="admin-search-input"
                    type="text"
                    placeholder="Search by username or email…"
                    value={userSearch}
                    onChange={e => handleSearchChange(e.target.value)}
                />
            </div>
            {usersLoading ? <Spinner /> : !users.length ? (
                <div className="admin-empty-page"><i className="bi bi-people" /><p>No users found</p></div>
            ) : (
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>User</th><th>Email</th><th>Status</th>
                            <th>Role</th><th>Joined</th><th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(u => (
                            <tr key={u._id}>
                                <td>
                                    <div className="user-cell">
                                        <div className="admin-avatar-wrap">
                                            <AvatarImg src={`${API}/users/${u._id}/profile-picture`} />
                                        </div>
                                        <span className="admin-username user-link"
                                            onClick={() => navigate(`/profile/${u._id}`)}>
                                            {u.username}
                                        </span>
                                    </div>
                                </td>
                                <td className="muted small">{u.email}</td>
                                <td><StatusBadge banned={u.isBanned} banExpiresAt={u.banExpiresAt} /></td>
                                <td>
                                    {u.isAdmin
                                        ? <span className="role-badge role-admin">Admin</span>
                                        : <span className="role-badge role-user">User</span>}
                                </td>
                                <td className="date-cell">{formatDate(u.createdAt)}</td>
                                <td>
                                    {!u.isAdmin && (
                                        u.isBanned
                                            ? <button className="adm-btn adm-btn-green"
                                                onClick={() => handleUnban(u._id)}>Unban</button>
                                            : <button className="adm-btn adm-btn-red"
                                                onClick={() => openBanModal(u._id, u.username)}>Ban</button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </>
    );

    // ── Tab: Removed Comments ──────────────────────────────────────────────────
    const renderRemovedComments = () => {
        if (removedLoading) return <Spinner />;
        if (!removed.length) return (
            <div className="admin-empty-page">
                <i className="bi bi-chat-x" />
                <p>No removed comments</p>
            </div>
        );
        return (
            <div className="removed-list">
                {removed.map(c => (
                    <div key={c._id} className="removed-card">
                        <div className="removed-card-meta">
                            <div className="admin-avatar-wrap admin-avatar-sm">
                                <AvatarImg src={`${API}/users/${c.author?._id}/profile-picture`} />
                            </div>
                            <span className="admin-username user-link"
                                onClick={() => c.author?._id && navigate(`/profile/${c.author._id}`)}>
                                {c.author?.username || 'Unknown'}
                            </span>
                            <span className="muted small">on</span>
                            <span className="song-ref user-link"
                                onClick={() => c.song?._id && navigate(`/song/${c.song._id}`)}>
                                {c.song?.title || 'Unknown Song'}
                            </span>
                            <span className="date-cell">{formatDate(c.updatedAt)}</span>
                        </div>
                        <p className="removed-card-content">{c.content}</p>
                        <div className="action-btns">
                            <button className="adm-btn adm-btn-green" onClick={() => handleRestore(c._id)}>
                                <i className="bi bi-arrow-counterclockwise" /> Restore
                            </button>
                            <button className="adm-btn adm-btn-red" onClick={() => handleHardDelete(c._id)}>
                                <i className="bi bi-trash3-fill" /> Delete Forever
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    // ── Tab: Moderation Log ────────────────────────────────────────────────────
    const renderModLog = () => {
        if (modLogLoading) return <Spinner />;
        if (!modLog.length) return (
            <div className="admin-empty-page">
                <i className="bi bi-journal" /><p>No moderation actions yet</p>
            </div>
        );
        return (
            <table className="admin-table">
                <thead>
                    <tr>
                        <th>Action</th><th>Target</th><th>Moderator</th>
                        <th>Reason</th><th>Expires</th><th>When</th>
                    </tr>
                </thead>
                <tbody>
                    {modLog.map(l => (
                        <tr key={l._id}>
                            <td><ActionBadge action={l.action} /></td>
                            <td className="admin-username user-link"
                                onClick={() => l.targetUser?._id && navigate(`/profile/${l.targetUser._id}`)}>
                                {l.targetUser?.username || '—'}
                            </td>
                            <td className="muted">{l.moderatedBy?.username || '—'}</td>
                            <td className="reason-cell">{l.reason}</td>
                            <td className="date-cell">
                                {l.expiresAt
                                    ? new Date(l.expiresAt).toLocaleDateString()
                                    : l.action === 'ban' ? 'Permanent' : '—'}
                            </td>
                            <td className="date-cell">{formatDate(l.createdAt)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        );
    };

    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <div className="admin-wrapper">
            {sidebar}

            <div className="admin-main">
                <div className="admin-header">
                    <i className="bi bi-shield-fill-check admin-shield-icon" />
                    <div>
                        <h1 className="admin-title">Admin Panel</h1>
                        <p className="admin-subtitle">Moderation &amp; Platform Management</p>
                    </div>
                </div>

                <div className="admin-tab-bar">
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            className={`admin-tab${activeTab === tab.id ? ' active' : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            <i className={`bi ${tab.icon}`} />
                            {tab.label}
                            {tab.id === 'reports' && overview?.pendingReports > 0 && (
                                <span className="tab-badge">{overview.pendingReports}</span>
                            )}
                        </button>
                    ))}
                </div>

                <div className="admin-content">
                    {activeTab === 'overview' && renderOverview()}
                    {activeTab === 'reports'  && renderReports()}
                    {activeTab === 'users'    && renderUsers()}
                    {activeTab === 'removed'  && renderRemovedComments()}
                    {activeTab === 'modlog'   && renderModLog()}
                </div>
            </div>

            {/* Ban modal */}
            {banModal && (
                <div className="admin-modal-overlay" onClick={() => setBanModal(null)}>
                    <div className="admin-modal" onClick={e => e.stopPropagation()}>
                        <div className="admin-modal-header">
                            <h2><i className="bi bi-slash-circle-fill" /> Ban User</h2>
                            <button className="modal-close-btn" onClick={() => setBanModal(null)}>
                                <i className="bi bi-x-lg" />
                            </button>
                        </div>
                        <p className="modal-username">@{banModal.username}</p>
                        <div className="modal-field">
                            <label>Reason</label>
                            <textarea
                                className="admin-textarea"
                                placeholder="Reason for ban…"
                                value={banReason}
                                onChange={e => setBanReason(e.target.value)}
                                rows={3}
                                maxLength={500}
                            />
                        </div>
                        <div className="modal-field">
                            <label>Duration</label>
                            <select
                                className="admin-select"
                                value={banDuration}
                                onChange={e => setBanDuration(e.target.value)}
                            >
                                <option value="1">1 Day</option>
                                <option value="3">3 Days</option>
                                <option value="7">7 Days</option>
                                <option value="30">30 Days</option>
                                <option value="permanent">Permanent</option>
                            </select>
                        </div>
                        <div className="modal-actions">
                            <button className="adm-btn adm-btn-ghost" onClick={() => setBanModal(null)}>
                                Cancel
                            </button>
                            <button
                                className="adm-btn adm-btn-red"
                                onClick={handleBanUser}
                                disabled={!banReason.trim() || banLoading}
                            >
                                {banLoading
                                    ? <i className="bi bi-arrow-repeat admin-spin" />
                                    : 'Confirm Ban'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
