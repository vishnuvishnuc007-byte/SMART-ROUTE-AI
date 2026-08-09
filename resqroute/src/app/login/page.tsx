'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'user' | 'help_team'>('user');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(searchParams.get('error'));
  const [message, setMessage] = useState<string | null>(searchParams.get('message'));

  const supabase = createClient();

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (mode === 'signup') {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              name: fullName,
              role: role,
            },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (signUpError) throw signUpError;
        setMessage('Check your email for the confirmation link.');
      } else {
        let authData;
        let signInError;
        try {
          const res = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          authData = res.data;
          signInError = res.error;
        } catch (err) {
          signInError = err;
        }

        // Auto-create Admin user if it doesn't exist in Supabase yet
        if (signInError && email === 'admin2008@gmail.com' && password === 'admin2008') {
          try {
            // Sign up
            const { error: signUpError } = await supabase.auth.signUp({
              email,
              password,
              options: {
                data: {
                  full_name: 'Administrator',
                  role: 'admin',
                }
              }
            });
            if (!signUpError) {
              // Sign in again on success
              const res = await supabase.auth.signInWithPassword({
                email,
                password,
              });
              authData = res.data;
              signInError = res.error;
            }
          } catch (signUpErr) {
            // Ignore sign up error and show original sign in error
          }
        }

        if (signInError) throw signInError;

        if (authData?.user) {
          const user = authData.user;
          // If the email is the admin email, make sure they have the admin role in the profiles table
          if (user.email === 'admin2008@gmail.com') {
            await supabase.from('profiles').upsert({
              id: user.id,
              email: user.email,
              role: 'admin',
              full_name: 'Administrator'
            });
            router.push('/admin');
            return;
          }

          // Fetch user's role from profiles table to decide redirect
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

          if (profile?.role === 'admin') {
            router.push('/admin');
          } else if (profile?.role === 'help_team') {
            router.push('/help-team');
          } else {
            router.push('/home');
          }
        } else {
          router.push('/home');
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An error occurred during authentication.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      // Store selected role for Google OAuth (will be read by auth callback)
      if (mode === 'signup') {
        localStorage.setItem('signup_role', role);
      }
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (oauthError) throw oauthError;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Google sign in failed.';
      setError(message);
      setLoading(false);
    }
  };



  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 overflow-hidden bg-slate-950 text-white font-sans">
      {/* Animated gradient background orbs */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-danger/10 rounded-full blur-[100px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-info/8 rounded-full blur-[100px] pointer-events-none animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute top-3/4 left-1/3 w-80 h-80 bg-warning/8 rounded-full blur-[100px] pointer-events-none animate-pulse" style={{ animationDelay: '2s' }} />

      {/* Floating feature badges */}
      <div className="hidden lg:block absolute top-20 left-16 animate-float z-10" style={{ animationDelay: '0s' }}>
        <div className="glass px-4 py-2 rounded-full border border-white/10 text-xs font-medium text-white/80 shadow-lg flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>24/7 Response</span>
        </div>
      </div>
      <div className="hidden lg:block absolute top-40 right-20 animate-float z-10" style={{ animationDelay: '1.5s' }}>
        <div className="glass px-4 py-2 rounded-full border border-white/10 text-xs font-medium text-white/80 shadow-lg flex items-center gap-2">
          <span>⚡ Real-time Alerts</span>
        </div>
      </div>
      <div className="hidden lg:block absolute bottom-32 left-24 animate-float z-10" style={{ animationDelay: '3s' }}>
        <div className="glass px-4 py-2 rounded-full border border-white/10 text-xs font-medium text-white/80 shadow-lg flex items-center gap-2">
          <span>📍 GPS Tracking</span>
        </div>
      </div>
      <div className="hidden lg:block absolute bottom-24 right-28 animate-float z-10" style={{ animationDelay: '4.5s' }}>
        <div className="glass px-4 py-2 rounded-full border border-white/10 text-xs font-medium text-white/80 shadow-lg flex items-center gap-2">
          <span>🛡️ Verified Reports</span>
        </div>
      </div>

      {/* Main Glassmorphism Card */}
      <div className="relative z-20 w-full max-w-md glass p-8 rounded-3xl border border-white/10 shadow-2xl backdrop-blur-xl animate-fade-in">
        {/* Header / Logo */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-danger/15 ring-1 ring-danger/30 flex items-center justify-center mb-3 shadow-inner">
            <span className="text-3xl">🚨</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white animate-gradient">
            SMART ROUTE AI
          </h1>
          <p className="text-sm text-white/60 mt-1 font-medium">
            Emergency Response System
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="rounded-xl bg-white/5 p-1 flex mb-6 border border-white/5">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
              setMessage(null);
            }}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
              mode === 'login'
                ? 'bg-white/15 text-white shadow-md'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setError(null);
              setMessage(null);
            }}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
              mode === 'signup'
                ? 'bg-white/15 text-white shadow-md'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Error and Success Messages */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-danger/10 border border-danger/30 text-danger text-xs font-medium text-center">
            {error}
          </div>
        )}
        {message && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium text-center">
            {message}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleEmailAuth} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-medium text-white/70 mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
                className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-danger/50 transition-all text-sm"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-white/70 mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-danger/50 transition-all text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-white/70 mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-danger/50 transition-all text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 rounded-2xl gradient-danger border border-danger/30 text-white font-semibold text-sm shadow-lg hover:opacity-90 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : mode === 'login' ? (
              'Sign In'
            ) : (
              `Create ${role === 'help_team' ? 'Help Team' : 'User'} Account`
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-6 flex items-center justify-center">
          <div className="w-full border-t border-white/10" />
          <span className="absolute bg-slate-900/80 px-3 text-xs text-white/40 font-medium rounded-full">
            OR
          </span>
        </div>

        {/* Google OAuth Button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full py-3 px-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 text-white font-medium text-sm transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Continue with Google</span>
        </button>

        {/* Bottom selector section */}
        <div className="mt-8 pt-6 border-t border-white/5 text-center space-y-4">
          <p className="text-[10px] uppercase tracking-wider text-white/30 font-bold">
            Create an Account
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setRole('user');
              }}
              className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                mode === 'signup' && role === 'user'
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-extrabold shadow'
                  : 'border-white/5 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
              }`}
            >
              👤 Register User
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setRole('help_team');
              }}
              className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                mode === 'signup' && role === 'help_team'
                  ? 'border-blue-500/30 bg-blue-500/10 text-blue-400 font-extrabold shadow'
                  : 'border-white/5 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
              }`}
            >
              🛡️ Register Help Team
            </button>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/5 text-[10px] text-white/40">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Secured with Supabase</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 text-white">
          <div className="w-8 h-8 border-2 border-danger/30 border-t-danger rounded-full animate-spin" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
