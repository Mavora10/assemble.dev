import React, { useState } from 'react';
import { authService } from '../../services/authService';



export const LoginView = ({ navigate, onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const newErrors = {};
    if (!email.trim()) {
      newErrors.email = 'Need to fill this field';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = 'Please provide a valid email address';
    }

    if (!password) {
      newErrors.password = 'Need to fill this field';
    }

    if (Object.keys(newErrors).length > 0) {
      setFieldErrors(newErrors);
      setError('Please fill in the required fields highlighted below.');
      return;
    }

    setIsLoading(true);

    // --- API-first login ---
    try {
      const { user, error: apiError, isNetworkError } = await authService.signInUser({ email: email.trim(), password });
      if (user && !apiError) {
        onLoginSuccess(user);
        setIsLoading(false);
        return;
      }
      // If backend is down, fall through to local auth
      if (!isNetworkError && apiError) {
        // Real auth error from server (wrong password, etc.)
        setFieldErrors({ email: apiError, password: apiError });
        setError(apiError);
        setIsLoading(false);
        return;
      }
    } catch (_) {
      // Network error — fall through to local
    }

    // --- Offline / demo fallback ---
    const localUsers = JSON.parse(localStorage.getItem('assemble_users') || '[]');

    const defaultUsers = [
      { name: 'John Doe', email: 'john.doe@example.com', password: 'password123', role: 'attendee', capabilities: ['attendee'] },
      { name: 'Alice Smith', email: 'attendee@connect.dev', password: 'password123', role: 'attendee', capabilities: ['attendee'] },
      { name: 'Bob Johnson', email: 'organizer@connect.dev', password: 'password123', role: 'organizer', capabilities: ['organizer', 'attendee'] },
      { name: 'Dr. Elena Rostova', email: 'speaker@connect.dev', password: 'password123', role: 'speaker', capabilities: ['speaker', 'attendee'], speakerProfile: { title: 'Principal AI Researcher', organization: 'Stanford AI Lab', topics: ['AI Ethics', 'Large Language Models'], feeType: 'fee', feeAmount: '3500', currency: '€', availability: 'Available for Bookings' } },
      { name: 'Marcus Vance', email: 'sponsor@connect.dev', password: 'password123', role: 'sponsor', capabilities: ['sponsor', 'attendee', 'organizer'], sponsorProfile: { companyName: 'TechNova Solutions', industry: 'Enterprise AI & Cloud', budgetRange: '€10,000+', budgetAmount: 25000 } },
      { name: 'David Chen', email: 'venue@connect.dev', password: 'password123', role: 'venue', capabilities: ['venue', 'attendee'], venueProfile: { venueName: 'Sir Mutha Concert Hall', capacity: 500, type: 'Auditorium' } },
    ];

    const allUsers = [...defaultUsers, ...localUsers];

    const matchedUser = allUsers.find(
      (u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password
    );

    setIsLoading(false);

    if (matchedUser) {
      onLoginSuccess(matchedUser);
    } else {
      setFieldErrors({
        email: 'Incorrect email or password',
        password: 'Incorrect email or password',
      });
      setError('Incorrect email or password. Please check the highlighted fields and try again.');
    }
  };

  const handleBack = () => {
    // A pending redirect means we were bounced here from a protected page;
    // going "back" to it would just bounce us to login again.
    const redirectPath = localStorage.getItem('assemble_redirect');
    if (redirectPath) {
      localStorage.removeItem('assemble_redirect');
      localStorage.removeItem('assemble_intended_role');
      navigate('/');
    } else if (window.history.length > 1) {
      window.history.back();
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4 py-12 text-left animate-fadeIn">
      <div className="bg-white/95 backdrop-blur-xl border border-white/60 rounded-[2.5rem] p-8 md:p-10 max-w-md w-full shadow-2xl shadow-blue-900/10 space-y-6">
        <div className="flex items-center justify-between border-b border-[#edeeef] pb-4">
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center gap-1.5 text-xs font-bold text-[#0f4c81] hover:text-[#00355f] hover:bg-blue-50 px-3 py-1.5 rounded-full transition-all cursor-pointer border border-blue-100"
          >
            <span className="material-symbols-outlined text-base">arrow_back</span>
            <span>Back</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-black text-white flex items-center justify-center text-xs font-bold font-geist">C</span>
            <span className="font-geist text-lg font-bold text-[#00355f]">Connect</span>
          </div>
        </div>

        <div className="text-center">
          <h2 className="font-geist text-2xl font-bold text-[#00355f]">Welcome Back</h2>
          <p className="font-inter text-xs text-[#5f5e5e] mt-1.5">
            Sign in to access your multi-role dashboard & live experiences
          </p>
        </div>

        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-600 rounded-2xl text-xs font-bold text-center flex items-center justify-center gap-1.5">
            <span className="material-symbols-outlined text-base">warning</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-bold text-[#00355f] uppercase tracking-wider block">
                Email Address
              </label>
              {fieldErrors.email && (
                <span className="text-[10px] font-bold text-rose-600">
                  {fieldErrors.email}
                </span>
              )}
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: '' }));
                if (error) setError('');
              }}
              placeholder="you@domain.com"
              className={`w-full px-4 py-3 rounded-xl text-sm font-inter transition-all ${
                fieldErrors.email
                  ? 'border-2 border-rose-500 bg-rose-50/50 text-rose-900 focus:outline-none focus:border-rose-600 focus:ring-2 focus:ring-rose-200'
                  : 'bg-[#f8f9fa] border border-[#c2c7d1] text-[#191c1d] focus:outline-none focus:border-[#0f4c81] focus:bg-white'
              }`}
            />
            {fieldErrors.email && (
              <p className="text-[11px] font-bold text-rose-600 mt-1 flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">error</span>
                <span>{fieldErrors.email}</span>
              </p>
            )}
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-bold text-[#00355f] uppercase tracking-wider block">
                Password
              </label>
              <button
                type="button"
                onClick={() => alert('Password reset link sent to your email (simulated).')}
                className="text-[10px] font-bold text-[#0f4c81] hover:underline"
              >
                Forgot Password?
              </button>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: '' }));
                if (error) setError('');
              }}
              placeholder="••••••••"
              className={`w-full px-4 py-3 rounded-xl text-sm font-inter transition-all ${
                fieldErrors.password
                  ? 'border-2 border-rose-500 bg-rose-50/50 text-rose-900 focus:outline-none focus:border-rose-600 focus:ring-2 focus:ring-rose-200'
                  : 'bg-[#f8f9fa] border border-[#c2c7d1] text-[#191c1d] focus:outline-none focus:border-[#0f4c81] focus:bg-white'
              }`}
            />
            {fieldErrors.password && (
              <p className="text-[11px] font-bold text-rose-600 mt-1 flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">error</span>
                <span>{fieldErrors.password}</span>
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 bg-[#0f4c81] text-white hover:bg-[#00355f] rounded-2xl font-geist font-bold text-xs shadow-md transition-all active:scale-98 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Signing in…
              </>
            ) : 'Log In to Account'}
          </button>
        </form>



        <div className="text-center pt-2 border-t border-[#edeeef]">
          <button
            onClick={() => navigate('/signup')}
            className="text-xs font-bold text-[#0f4c81] hover:underline cursor-pointer"
          >
            Don’t have an account? Sign Up
          </button>
        </div>
      </div>
    </div>
  );
};
export default LoginView;
