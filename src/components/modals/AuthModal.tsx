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
      return 'Incorrect email or password, or account does not exist yet. You can sign up with this email under the Sign Up tab.';
    }
    if (code === 'auth/wrong-password') {
      return 'Incorrect password. Please check your credentials or reset password.';
    }
    if (code === 'auth/email-already-in-use') {
      return 'This email is already registered. Please switch to the Log In tab.';
    }
    if (code === 'auth/weak-password') {
      return 'Password must be at least 6 characters.';
    }
    if (code === 'auth/invalid-email') {
      return 'Please enter a valid email address.';
    }
    return err.message || 'Authentication error. Please check your details.';
  };

  const handleQuickLogin = async (demoEmail: string, demoPass: string, demoName: string, demoUsername: string) => {
    setErrorMsg('');
    setLoading(true);
    try {
      // First try signing in
      await authService.signIn(demoEmail, demoPass);
      await refreshProfile();
      showToast(`Signed in as @${demoUsername}!`, 'success');
      onClose();
    } catch (err: any) {
      // If user doesn't exist, automatically sign up
      if (err?.code === 'auth/user-not-found' || err?.code === 'auth/invalid-credential') {
        try {
          await authService.signUp(demoEmail, demoPass, demoName, demoUsername);
          await refreshProfile();
          showToast(`Account created and signed in as @${demoUsername}!`, 'success');
          onClose();
          return;
        } catch (signupErr: any) {
          setErrorMsg(mapAuthError(signupErr));
        }
      } else {
        setErrorMsg(mapAuthError(err));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      if (tab === 'login') {
        await authService.signIn(email, password);
        await refreshProfile();
        showToast('Welcome back to ZOR!', 'success');
        onClose();
      } else if (tab === 'signup') {
        if (!usernameAvailable) {
          throw new Error('Please select an available username');
        }
        await authService.signUp(email, password, displayName, username);
        await refreshProfile();
        showToast('Welcome to ZOR! Your account is ready.', 'success');
        onClose();
      } else if (tab === 'forgot') {
        await authService.resetPassword(email);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in select-none">
      <div className="relative w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8 shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand Header */}
        <div className="flex flex-col items-center mb-6 text-center">
          <ZorLogo size={42} />
          <h2 className="mt-3 text-lg font-bold text-slate-100">
            {tab === 'login' ? 'Sign in to ZOR' : tab === 'signup' ? 'Create your ZOR account' : 'Reset your password'}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {tab === 'login'
              ? 'Enter your credentials to access your feed'
              : tab === 'signup'
              ? 'Join millions exploring real-time discussions'
              : 'Enter your email to receive recovery instructions'}
          </p>
        </div>

        {/* Tab switchers */}
        {tab !== 'forgot' && (
          <div className="flex items-center gap-1 p-1 mb-5 bg-slate-950 rounded-xl border border-slate-800/80">
            <button
              type="button"
              onClick={() => {
                setTab('login');
                setErrorMsg('');
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                tab === 'login'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Log In
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('signup');
                setErrorMsg('');
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                tab === 'signup'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sign Up
            </button>
          </div>
        )}

        {/* Error notice */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {tab === 'signup' && (
            <>
              <div>
                <label className="block text-slate-300 font-medium mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Alex Rivera"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Username</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-slate-500 font-mono">@</span>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    placeholder="handle"
                    maxLength={20}
                    className="w-full pl-8 pr-9 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none font-mono"
                  />
                  <div className="absolute right-3 top-3">
                    {usernameChecking && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
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
            <label className="block text-slate-300 font-medium mb-1">Email address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@domain.com"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {tab !== 'forgot' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-slate-300 font-medium">Password</label>
                {tab === 'login' && (
                  <button
                    type="button"
                    onClick={() => {
                      setTab('forgot');
                      setErrorMsg('');
                    }}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300"
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
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none font-mono"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading || (tab === 'signup' && usernameAvailable === false)}
            className="w-full mt-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white font-bold transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>
              {tab === 'login' ? 'Sign In' : tab === 'signup' ? 'Create Account' : 'Send Reset Link'}
            </span>
          </button>

          {tab === 'forgot' && (
            <button
              type="button"
              onClick={() => {
                setTab('login');
                setErrorMsg('');
              }}
              className="w-full text-center text-xs text-slate-400 hover:text-slate-200 mt-2"
            >
              Back to Sign In
            </button>
          )}
        </form>

        {/* 1-Click Quick Access for immediate testing */}
        {tab !== 'forgot' && (
          <div className="mt-4 pt-3.5 border-t border-slate-800/80">
            <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 text-center mb-2">
              Quick 1-Click Access
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('bioasif77@gmail.com', 'AdminPass123!', 'Asif Bio', 'bioasif77')}
                disabled={loading}
                className="py-2 px-2.5 rounded-xl border border-indigo-500/40 hover:border-indigo-500 bg-indigo-950/20 hover:bg-indigo-950/40 text-indigo-300 font-medium text-xs transition-colors flex items-center justify-center"
              >
                <span>Admin (bioasif77)</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('creator@zor.network', 'CreatorPass123!', 'Elena Vance', 'elena_vance')}
                disabled={loading}
                className="py-2 px-2.5 rounded-xl border border-slate-700 hover:border-slate-500 bg-slate-950/60 hover:bg-slate-800 text-slate-300 font-medium text-xs transition-colors flex items-center justify-center"
              >
                <span>Demo Creator</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
