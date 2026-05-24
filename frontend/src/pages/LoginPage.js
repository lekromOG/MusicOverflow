import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './LoginPage.css';

export default function LoginPage() {
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState('signin');
    const [staySignedIn, setStaySignedIn] = useState(false);

    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const isCreateTab = activeTab === 'create';

    const handleTabSwitch = (tab) => {
        setActiveTab(tab);
        setError('');
        setSuccess('');
        setUsername('');
        setEmail('');
        setPassword('');
    };

    const handleSubmit = async () => {
        setError('');
        setSuccess('');

        if (isCreateTab) {
            if (!username || !email || !password) {
                setError('All fields are required.');
                return;
            }
            try {
                await axios.post('http://localhost:5000/api/users/register', {
                    username,
                    email,
                    password
                });
                setSuccess('Account created! You can now sign in.');
                handleTabSwitch('signin');
            } catch (err) {
                setError(err.response?.data?.error || 'Registration failed.');
            }
        } else {
            if (!email || !password) {
                setError('Please enter your email and password.');
                return;
            }
            try {
                const res = await axios.post('http://localhost:5000/api/users/login', {
                    email,
                    password
                });
                localStorage.setItem('token', res.data.token);
                localStorage.setItem('user', JSON.stringify(res.data.user));
                navigate('/');
            } catch (err) {
                navigate('/404');
            }
        }
    };

    return (
        <div className="login-page">
            <div className="login-left">
                <div className="left-top">
                    <div className="brand">
                        <div className="logo-placeholder">
                            <i className="bi bi-music-note-beamed" />
                        </div>
                        <div className="brand-text">
                            <span className="brand-name">MusicOverflow</span>
                            <span className="brand-tagline">MUSIC FOR THE LATE HOURS</span>
                        </div>
                    </div>
                </div>

                <div className="left-middle">
                    <span className="now-playing">// NOW PLAYING SOMEWHERE</span>
                    <h1 className="hero-text">
                        For the <span className="neon-blue">3am</span> producers,<br />
                        the <span className="neon-pink">crate-diggers</span>,<br />
                        the listeners.
                    </h1>
                    <p className="hero-sub">
                        Upload your tracks. Find your people. Drop comments at the exact second the drop hits.
                    </p>
                </div>

                <div className="left-bottom">
                    <div className="stat">
                        <span className="stat-number">0</span>
                        <span className="stat-label">Tracks</span>
                    </div>
                    <div className="stat-divider" />
                    <div className="stat">
                        <span className="stat-number">0</span>
                        <span className="stat-label">Artists</span>
                    </div>
                    <div className="stat-divider" />
                    <div className="stat">
                        <span className="stat-number">0</span>
                        <span className="stat-label">Listeners</span>
                    </div>
                </div>

                <div className="left-bg">
                    <div className="orb orb-1" />
                    <div className="orb orb-2" />
                    <div className="orb orb-3" />
                    <div className="orb orb-4" />
                    <div className="orb orb-5" />
                    <div className="orb orb-6" />
                    <div className="stripes" />
                </div>
            </div>

            <div className="login-right">
                <div className="right-inner">
                    <div className="tab-buttons">
                        <button
                            className={`tab-btn ${!isCreateTab ? 'active' : ''}`}
                            onClick={() => handleTabSwitch('signin')}
                        >
                            Sign In
                        </button>
                        <button
                            className={`tab-btn ${isCreateTab ? 'active' : ''}`}
                            onClick={() => handleTabSwitch('create')}
                        >
                            Create Account
                        </button>
                        <div className={`tab-slider ${isCreateTab ? 'right' : ''}`} />
                    </div>

                    <div className="welcome">
                        <h2 className="welcome-title">{isCreateTab ? 'Create account' : 'Welcome back'}</h2>
                        <p className="welcome-sub">{isCreateTab ? 'Join MusicOverflow today' : 'Pick up where you left off'}</p>
                    </div>

                    {error && <p className="form-error">{error}</p>}
                    {success && <p className="form-success">{success}</p>}

                    <div className="form-fields">
                        {isCreateTab && (
                            <div className="field">
                                <label className="field-label">USERNAME</label>
                                <input
                                    className="field-input"
                                    type="text"
                                    placeholder="Choose a username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                />
                            </div>
                        )}
                        <div className="field">
                            <label className="field-label">{isCreateTab ? 'EMAIL' : 'EMAIL'}</label>
                            <input
                                className="field-input"
                                type={isCreateTab ? 'email' : 'text'}
                                placeholder={isCreateTab ? 'Enter your email' : 'Enter your email'}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div className="field">
                            <label className="field-label">PASSWORD</label>
                            <input
                                className="field-input"
                                type="password"
                                placeholder="Enter your password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={staySignedIn}
                                onChange={() => setStaySignedIn(!staySignedIn)}
                                className="checkbox-input"
                            />
                            <span className="checkbox-custom" />
                            Stay signed in
                        </label>
                        {!isCreateTab && (
                            <button className="forgot-btn">Forgot password?</button>
                        )}
                    </div>

                    <button className="signin-btn" onClick={handleSubmit}>
                        {isCreateTab ? 'Create Account' : 'Sign In'}
                    </button>

                    <div className="divider">
                        <span className="divider-line" />
                        <span className="divider-text">OR</span>
                        <span className="divider-line" />
                    </div>

                    <div className="oauth-buttons">
                        <button className="oauth-btn">
                            <i className="bi bi-google" />
                            Continue with Google <span className="wip">(W.I.P)</span>
                        </button>
                        <button className="oauth-btn">
                            <i className="bi bi-apple" />
                            Continue with Apple <span className="wip">(W.I.P)</span>
                        </button>
                    </div>

                    <p className="security-note">[ secured / mongo+jwt / no third-party trackers ]</p>
                </div>
            </div>
        </div>
    );
}
