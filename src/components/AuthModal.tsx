import { FormEvent, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from 'firebase/auth';
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  User as UserIcon,
  X,
} from 'lucide-react';
import { auth, googleProvider } from '../lib/firebase';
import { VoltPayLogo } from './VoltPayLogo';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (message?: string) => void;
}

type AuthMode = 'signin' | 'signup';

function mapAuthError(code: string): string {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Invalid email or password. Please check and try again.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Switch to Sign In instead.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters long.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment before trying again.';
    case 'auth/operation-not-allowed':
      return 'Email & Password sign-in is not enabled yet in your Firebase Console (Authentication → Sign-in method). You can use Google Sign-In below.';
    case 'auth/popup-closed-by-user':
      return 'Google sign-in popup was closed before finishing.';
    case 'auth/popup-blocked':
      return 'Popup was blocked by your browser. Allow popups and try again.';
    default:
      return 'Unable to complete sign-in right now. Please try again.';
  }
}

export function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setError(null);
    setInfoMessage(null);
  };

  const handleEmailAuth = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);

    const trimmedEmail = email.trim();
    const trimmedUsername = username.trim();

    if (mode === 'signup') {
      if (trimmedUsername.length < 3 || trimmedUsername.length > 40) {
        setError('Username must be between 3 and 40 characters.');
        return;
      }
    }

    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);
    try {
      if (mode === 'signup') {
        const cred = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
        await updateProfile(cred.user, { displayName: trimmedUsername });
        try {
          await sendEmailVerification(cred.user);
        } catch {
          // Ignore verification email rate limit during initial creation
        }
        onSuccess?.(
          `Welcome, ${trimmedUsername}! Check ${trimmedEmail} for a verification link to enable cloud sync.`
        );
        onClose();
      } else {
        await signInWithEmailAndPassword(auth, trimmedEmail, password);
        onSuccess?.('Signed in to your VoltPay account.');
        onClose();
      }
    } catch (err) {
      const code = (err as { code?: string })?.code ?? '';
      setError(mapAuthError(code));
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setError(null);
    setInfoMessage(null);
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setError('Enter your account email above first, then click Forgot Password.');
      return;
    }
    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, trimmedEmail);
      setInfoMessage(`Password reset link sent to ${trimmedEmail}.`);
    } catch (err) {
      const code = (err as { code?: string })?.code ?? '';
      setError(mapAuthError(code));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    setInfoMessage(null);
    try {
      await signInWithPopup(auth, googleProvider);
      onSuccess?.('Signed in — your account is synced.');
      onClose();
    } catch (err) {
      const code = (err as { code?: string })?.code ?? '';
      setError(mapAuthError(code));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs"
    >
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden max-h-[92vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <VoltPayLogo size={28} />
            <span className="font-display text-base font-bold text-slate-900">VoltPay Account</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close login dialog"
            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <h2 id="auth-modal-title" className="font-display text-xl font-bold text-slate-900">
              {mode === 'signin' ? 'Sign in to VoltPay' : 'Create your VoltPay account'}
            </h2>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Sync your INR wallet balance, saved numbers, and receipts across mobile and computer.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-100">
            <button
              type="button"
              onClick={() => switchMode('signin')}
              className={`h-9 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                mode === 'signin'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => switchMode('signup')}
              className={`h-9 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                mode === 'signup'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-3.5" noValidate>
            {mode === 'signup' && (
              <div>
                <label
                  htmlFor="auth-username"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Username
                </label>
                <div className="relative">
                  <UserIcon
                    className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    id="auth-username"
                    type="text"
                    required
                    minLength={3}
                    maxLength={40}
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Choose a username"
                    className="w-full h-11 pl-10 pr-3.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-700/15"
                  />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="auth-email" className="block text-xs font-medium text-slate-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail
                  className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  id="auth-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full h-11 pl-10 pr-3.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-700/15"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="auth-password"
                  className="block text-xs font-medium text-slate-700"
                >
                  Password
                </label>
                {mode === 'signin' && (
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={handleForgotPassword}
                    className="text-xs font-medium text-blue-700 hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock
                  className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'signup' ? 'Minimum 6 characters' : 'Enter your password'}
                  className="w-full h-11 pl-10 pr-11 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-700/15"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 absolute right-1 top-1/2 -translate-y-1/2 cursor-pointer"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <Eye className="w-4 h-4" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2 text-xs text-red-700 leading-relaxed"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            {infoMessage && (
              <div
                role="status"
                className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-2 text-xs text-emerald-800 leading-relaxed"
              >
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{infoMessage}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 rounded-xl bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  <span>{mode === 'signup' ? 'Creating account...' : 'Signing in...'}</span>
                </>
              ) : (
                <span>{mode === 'signup' ? 'Create Account' : 'Sign In with Password'}</span>
              )}
            </button>
          </form>

          <div className="relative flex items-center">
            <div className="flex-grow border-t border-slate-200" />
            <span className="px-3 text-xs text-slate-400 font-medium">or</span>
            <div className="flex-grow border-t border-slate-200" />
          </div>

          <button
            type="button"
            disabled={isLoading}
            onClick={handleGoogleSignIn}
            className="w-full h-11 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-60 text-slate-900 text-sm font-semibold flex items-center justify-center gap-3 transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full h-9 text-xs font-medium text-slate-500 hover:text-slate-800 cursor-pointer"
          >
            Continue without signing in
          </button>
        </div>
      </div>
    </div>
  );
}
