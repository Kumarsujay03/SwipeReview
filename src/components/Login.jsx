import React, { useState } from 'react';
import { User, Lock, ArrowRight } from 'lucide-react';
import '../styles/Login.css';

const Login = ({ onLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Valid users
    const USERS = [
        { name: 'Sujay', email: 'reviewer@example.com', password: 'REDACTED' },
        { name: 'Akshat', email: 'reviewer@example.com', password: 'REDACTED' }
    ];

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        // Simulate API call
        setTimeout(() => {
            const user = USERS.find(u => u.email === email && u.password === password);

            if (user) {
                const userData = { name: user.name, email: user.email };
                // localStorage.setItem('user', JSON.stringify(userData)); // Handled in App.jsx
                onLogin(userData);
            } else {
                setError('Invalid credentials');
                setLoading(false);
            }
        }, 1000);
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="login-header">
                    <h2>Welcome Back</h2>
                    <p>Sign in to continue reviewing</p>
                </div>

                <form onSubmit={handleSubmit} className="login-form">
                    <div className="input-group">
                        <User className="input-icon" size={20} />
                        <input
                            type="email"
                            placeholder="Email Address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className="input-group">
                        <Lock className="input-icon" size={20} />
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    {error && <div className="error-message">{error}</div>}

                    <button type="submit" className="login-btn" disabled={loading}>
                        {loading ? 'Signing in...' : 'Sign In'}
                        {!loading && <ArrowRight size={20} />}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;
