import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/frontend/presentation/providers/AuthProvider';

function parseLoginError(err: unknown): string {
  if (!(err instanceof Error)) return '登入失敗';
  const jsonMatch = err.message.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const body = JSON.parse(jsonMatch[0]) as { detail?: string };
      if (typeof body.detail === 'string') return body.detail;
    } catch {
      /* ignore */
    }
  }
  return err.message;
}

const DEMO_ACCOUNTS = [
  { email: 'user1@test.com', label: 'Yu（賣家）' },
  { email: 'user2@test.com', label: 'Mina（買家）' },
  { email: 'user3@test.com', label: 'Ken' },
] as const;

export default function Login() {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
  const [email, setEmail] = useState('user2@test.com');
  const [password, setPassword] = useState('password');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(parseLoginError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f6f6f6] flex flex-col items-center justify-center px-6 max-w-[470px] mx-auto border-x border-black/[0.08]">
      <div className="w-full glass-card rounded-3xl p-8 space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-black text-on-surface tracking-tight">BlindBox</h1>
          <p className="text-sm text-on-surface-variant">登入以繼續使用市集</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
              電子郵件
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full bg-white border border-black/[0.08] rounded-xl px-4 py-3 text-sm text-on-surface focus:ring-1 focus:ring-primary/40 outline-none"
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
              密碼
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full bg-white border border-black/[0.08] rounded-xl px-4 py-3 text-sm text-on-surface focus:ring-1 focus:ring-primary/40 outline-none"
              required
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="doodle-press w-full py-4 premium-gradient rounded-full text-white font-bold text-sm disabled:opacity-60 transition-transform"
          >
            {submitting ? '登入中…' : '登入'}
          </button>
        </form>

        <div className="space-y-2">
          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider text-center">
            測試帳號（密碼 password）
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            {DEMO_ACCOUNTS.map((a) => (
              <button
                key={a.email}
                type="button"
                onClick={() => setEmail(a.email)}
                className="text-[10px] font-bold px-3 py-1.5 rounded-full bg-white border border-black/[0.08] text-on-surface-variant hover:border-primary/40 hover:text-primary transition-colors"
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
