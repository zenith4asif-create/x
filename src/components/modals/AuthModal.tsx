import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { authService } from '../../services/authService';
import { ZorLogo } from '../brand/ZorLogo';
import { X, Check, AlertCircle, Loader2 } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'login' | 'signup';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'login'
}) => {
  const { refreshProfile } = useAuth();
  const { showToast } = useToast();

  const [tab, setTab] = useState<'login' | 'signup' | 'forgot'>(initialTab);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    setTab(initialTab);
    setErrorMsg('');
  }, [initialTab, isOpen]);

  // Debounced username availability check
  useEffect(() => {
    if (tab !== 'signup' || !username.trim() || username.length < 3) {
      setUsernameAvailable(null);
      return;
    }

    const timer = setTimeout(async () => {
      setUsernameChecking(true);
      try {
        const avail = await authService.checkUsernameAvailable(username);
        setUsernameAvailable(avail);
      } catch {
        setUsernameAvailable(null);
      } finally {
        setUsernameChecking(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [username, tab]);

  if (!isOpen) return null;

  const mapAuthError = (err: any): string => {
    const code = err?.code || '';
    if (code === 'auth/user-not-found' || code === 'auth/invalid-credential') {
      return 'Incorrect email or password, or account does not exist. Please check your credentials or create a real account.';
    }
    if (code === 'auth/wrong-password') {
      return 'Incorrect password. Please verify your password or reset it.';
    }
    if (code === 'auth/email-already-in-use') {
      return 'This email address is already registered. Please log in instead.';
    }
    if (code === 'auth/weak-password') {
      return 'Password should be at least 6 characters.';
    }
    if (code === 'auth/invalid-email') {
      return 'Please enter a valid email address.';
    }
    return err.message || 'Authentication error. Please check your details.';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      if (tab === 'login') {
        await authService.signIn(email.trim(), password);
        await refreshProfile();
        showToast('Welcome back to ZOR!', 'success');
        onClose();
      } else if (tab === 'signup') {
        if (!usernameAvailable) {
          throw new Error('Please choose an available username');
        }
        await authService.signUp(email.trim(), password, displayName.trim(), username.trim());
        await refreshProfile();
        showToast('Account created successfully! Welcome to ZOR.', 'success');
        onClose();
      } else if (tab === 'forgot') {
        await authService.resetPassword(email.trim());
        showToast('Password reset link sent to your email.', 'success');
        setTab('login');
      }
    } catch (err: any) {
      setErrorMsg(mapAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md rounded-3xl bg-black border border-[#2f3336] p-6 sm:p-8 shadow-2xl animate-in zoom-in-95 duration-150"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-[#71767b] hover:text-[#e7e9ea] hover:bg-white/10 transition-colors"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand Header */}
        <div className="flex flex-col items-center mb-6 text-center">
          <ZorLogo size={42} showText={false} />
          <h2 className="mt-3 text-xl font-black text-[#e7e9ea] tracking-tight">
            {tab === 'login' ? 'Sign in to ZOR' : tab === 'signup' ? 'Create your real account' : 'Reset your password'}
          </h2>
          <p className="text-xs text-[#71767b] mt-1 max-w-xs">
            {tab === 'login'
              ? 'Enter your registered credentials to join the conversation.'
              : tab === 'signup'
              ? 'Only real verified users can post, reply, and interact.'
              : 'Enter your registered email to receive reset instructions.'}
          </p>
        </div>

        {/* Tab switchers */}
        {tab !== 'forgot' && (
          <div className="flex items-center gap-1 p-1 mb-5 bg-[#16181c] rounded-2xl border border-[#2f3336]">
            <button
              type="button"
              onClick={() => {
                setTab('login');
                setErrorMsg('');
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                tab === 'login'
                  ? 'bg-white text-black shadow-sm'
                  : 'text-[#71767b] hover:text-[#e7e9ea]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('signup');
                setErrorMsg('');
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                tab === 'signup'
                  ? 'bg-white text-black shadow-sm'
                  : 'text-[#71767b] hover:text-[#e7e9ea]'
              }`}
            >
              Create Account
            </button>
          </div>
        )}

        {/* Error notice */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span className="leading-snug">{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {tab === 'signup' && (
            <>
              <div>
                <label className="block text-[#e7e9ea] font-bold mb-1.5">Full Name</label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Asif Ansari"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#2f3336] bg-[#16181c] text-[#e7e9ea] placeholder-[#71767b] focus:border-[#1d9bf0] focus:ring-1 focus:ring-[#1d9bf0] focus:outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-[#e7e9ea] font-bold mb-1.5">Username</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-[#71767b] font-mono">@</span>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    placeholder="handle"
                    maxLength={20}
                    className="w-full pl-8 pr-9 py-2.5 rounded-xl border border-[#2f3336] bg-[#16181c] text-[#e7e9ea] placeholder-[#71767b] focus:border-[#1d9bf0] focus:ring-1 focus:ring-[#1d9bf0] focus:outline-none font-mono transition-all"
                  />
                  <div className="absolute right-3 top-3">
                    {usernameChecking && <Loader2 className="w-4 h-4 animate-spin text-[#71767b]" />}
                    {!usernameChecking && usernameAvailable === true && (
                      <Check className="w-4 h-4 text-emerald-400" />
                    )}
                    {!usernameChecking && usernameAvailable === false && (
                      <X className="w-4 h-4 text-rose-400" />
                    )}
                  </div>
                </div>
                {usernameAvailable === false && (
                  <p className="text-[11px] text-rose-400 mt-1">Username is already taken</p>
                )}
              </div>
            </>
          )}

          <div>
            <label className="block text-[#e7e9ea] font-bold mb-1.5">Email address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#2f3336] bg-[#16181c] text-[#e7e9ea] placeholder-[#71767b] focus:border-[#1d9bf0] focus:ring-1 focus:ring-[#1d9bf0] focus:outline-none transition-all"
            />
          </div>

          {tab !== 'forgot' && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[#e7e9ea] font-bold">Password</label>
                {tab === 'login' && (
                  <button
                    type="button"
                    onClick={() => {
                      setTab('forgot');
                      setErrorMsg('');
                    }}
                    className="text-[11px] text-[#1d9bf0] hover:underline"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#2f3336] bg-[#16181c] text-[#e7e9ea] placeholder-[#71767b] focus:border-[#1d9bf0] focus:ring-1 focus:ring-[#1d9bf0] focus:outline-none font-mono transition-all"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading || (tab === 'signup' && usernameAvailable === false)}
            className="w-full mt-4 py-3 rounded-full bg-white hover:bg-neutral-200 active:scale-[0.98] text-black font-extrabold text-sm transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin text-black" />}
            <span>
              {tab === 'login' ? 'Sign In' : tab === 'signup' ? 'Create Real Account' : 'Send Reset Link'}
            </span>
          </button>

          {tab === 'forgot' && (
            <button
              type="button"
              onClick={() => {
                setTab('login');
                setErrorMsg('');
              }}
              className="w-full text-center text-xs text-[#71767b] hover:text-[#e7e9ea] mt-2 transition-colors"
            >
              Back to Sign In
            </button>
          )}
        </form>
      </div>
    </div>
  );
};
