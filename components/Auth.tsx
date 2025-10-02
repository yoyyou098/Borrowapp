
import React, { useState, useContext, useEffect, useMemo } from 'react';
import * as api from '../services/localApi';
import { ADMIN_CODE } from '../constants';
import { AppContext } from '../App';
import type { User } from '../types';

const LogoDisplay: React.FC = () => {
    const { settings } = useContext(AppContext);
    
    return (
        <div className="mx-auto w-16 h-16 rounded-full bg-primary flex items-center justify-center overflow-hidden">
            {settings.logoMode === 'icon' ? (
                <span className="text-white text-2xl">{settings.icon || '🏃'}</span>
            ) : (
                <img src={settings.logoDataUrl} alt="logo" className="w-full h-full object-cover" />
            )}
        </div>
    );
};

const SignupForm: React.FC<{ onSwitchToLogin: () => void }> = ({ onSwitchToLogin }) => {
    const { showToast } = useContext(AppContext);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isAdmin, setIsAdmin] = useState(false);
    const [adminCode, setAdminCode] = useState('');
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
  
    const passwordRules = useMemo(() => {
      const len = password.length >= 8;
      const letters = /[A-Za-z]/.test(password);
      const digits = /\d/.test(password);
      return { len, letters, digits, ok: len && letters && digits };
    }, [password]);

    const validate = () => {
        const newErrors: { [key: string]: string } = {};
        if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(email)) {
            newErrors.email = 'Invalid email format.';
        } else if (api.getUsers().find(u => u.email === email.toLowerCase())) {
            newErrors.email = 'This email is already in use.';
        }
        if (!passwordRules.ok) {
            newErrors.password = 'Password must be at least 8 characters and include letters and numbers.';
        }
        if (isAdmin && adminCode !== ADMIN_CODE) {
            newErrors.adminCode = 'Incorrect admin code.';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };
  
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) {
            showToast('Validation Error', 'Please check the form for errors.', 'error');
            return;
        }
        const passwordHash = await api.hashPassword(password);
        const newUser: User = {
            email: email.toLowerCase(),
            passwordHash,
            role: isAdmin ? 'admin' : 'student',
            createdAt: Date.now(),
        };
        const users = api.getUsers();
        api.saveUsers([...users, newUser]);
        showToast('Account Created', 'You can now log in with your new account.', 'success');
        onSwitchToLogin();
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent px-4 py-3 outline-none"
                    placeholder="you@example.com" />
                {errors.email && <p className="mt-2 text-sm text-red-500">{errors.email}</p>}
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent px-4 py-3 outline-none"
                    placeholder="At least 8 characters with letters & numbers" />
                <ul className="mt-2 text-xs space-y-1">
                    <li className={passwordRules.len ? 'text-green-600' : 'text-gray-600'}>• At least 8 characters</li>
                    <li className={passwordRules.letters ? 'text-green-600' : 'text-gray-600'}>• Contains letters</li>
                    <li className={passwordRules.digits ? 'text-green-600' : 'text-gray-600'}>• Contains numbers</li>
                </ul>
                {errors.password && <p className="mt-2 text-sm text-red-500">{errors.password}</p>}
            </div>
            <div className="space-y-2 bg-gray-50 rounded-lg p-3">
                <label className="inline-flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={isAdmin} onChange={e => setIsAdmin(e.target.checked)} className="rounded border-gray-300 text-primary-app focus:ring-primary"/>
                    Sign up as Admin
                </label>
                {isAdmin && (
                    <div className="fade-in">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Admin Code</label>
                        <input type="text" value={adminCode} onChange={e => setAdminCode(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent px-4 py-3 outline-none"
                            placeholder="Enter admin code" />
                        {errors.adminCode && <p className="mt-2 text-sm text-red-500">{errors.adminCode}</p>}
                    </div>
                )}
            </div>
            <div className="space-y-3">
                <button type="submit" className="w-full bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg py-3 transition-colors">Create Account</button>
                <p className="text-center text-sm text-gray-500">
                    Already have an account? <button type="button" onClick={onSwitchToLogin} className="text-primary-app hover:underline font-medium">Log in</button>
                </p>
            </div>
        </form>
    );
};


const LoginForm: React.FC<{ onSwitchToSignup: () => void }> = ({ onSwitchToSignup }) => {
    const { login, showToast } = useContext(AppContext);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        const user = api.getUsers().find(u => u.email === email.trim().toLowerCase());
        if (user && await api.verifyPassword(password, user.passwordHash)) {
            login(user);
        } else {
            setError('Invalid email or password.');
            showToast('Login Failed', 'Invalid email or password.', 'error');
        }
    };
    
    return (
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent px-4 py-3 outline-none"
                    placeholder="you@example.com" />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent px-4 py-3 outline-none"
                    placeholder="Enter your password" />
                {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
            </div>
            <div className="space-y-3">
                <button type="submit" className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg py-3 transition-colors">Log In</button>
                <p className="text-center text-sm text-gray-500">
                    Don't have an account? <button type="button" onClick={onSwitchToSignup} className="text-primary-app hover:underline font-medium">Sign up</button>
                </p>
            </div>
        </form>
    );
};


const Auth: React.FC = () => {
    const [isLoginView, setIsLoginView] = useState(true);

    return (
        <section className="min-h-screen flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 sm:p-8 fade-in">
                <div className="text-center mb-6">
                    <LogoDisplay />
                    <h1 className="mt-4 text-xl font-semibold text-gray-800">Sports Equipment System</h1>
                    <p className="text-gray-500 text-sm">
                        {isLoginView ? 'Log in to borrow equipment' : 'Create an account to get started'}
                    </p>
                </div>
                {isLoginView ? (
                    <LoginForm onSwitchToSignup={() => setIsLoginView(false)} />
                ) : (
                    <SignupForm onSwitchToLogin={() => setIsLoginView(true)} />
                )}
            </div>
        </section>
    );
};

export default Auth;
