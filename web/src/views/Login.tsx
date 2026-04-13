import React from 'react';
import {LogIn, UserPlus, MailCheck} from 'lucide-react';
import LocaleSwitcher from '../components/LocaleSwitcher';
import {useNavigate, useSearchParams} from 'react-router-dom';
import {ApiError, apiPost} from '../lib/api';
import {setAuthSession, type AuthSession} from '../lib/session';
import { useTranslation } from "react-i18next";

type Mode = 'login' | 'register';

function safePostLoginPath(raw: string | null): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/login')) return '/models';
  return raw;
}

export default function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const postLoginPath = React.useMemo(() => safePostLoginPath(searchParams.get('next')), [searchParams]);
  const [mode, setMode] = React.useState<Mode>('login');
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState<string>('');
  const [error, setError] = React.useState<string>('');

  const [account, setAccount] = React.useState('');
  const [password, setPassword] = React.useState('');

  const [username, setUsername] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [displayName, setDisplayName] = React.useState('');
  const [registerPassword, setRegisterPassword] = React.useState('');
  const [verificationCode, setVerificationCode] = React.useState('');
  const [verificationSent, setVerificationSent] = React.useState(false);

  const handleError = (err: unknown) => {
    if (err instanceof ApiError) {
      const bodyMessage = err.body?.error;
      setError(bodyMessage || err.message);
      return;
    }
    setError(err instanceof Error ? err.message : t('login.request_failed'));
  };

  const handleLogin = async () => {
    if (!account.trim() || !password.trim()) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const loginAccount = account.trim();
      let session: AuthSession;
      try {
        session = await apiPost<AuthSession>('/api/auth/login', {
          username: loginAccount,
          password,
        });
      } catch (err) {
        if (!(err instanceof ApiError) || err.status !== 400) {
          throw err;
        }
        try {
          session = await apiPost<AuthSession>('/api/auth/login', {
            account: loginAccount,
            password,
          });
        } catch (fallbackErr) {
          if (!(fallbackErr instanceof ApiError) || fallbackErr.status !== 400) {
            throw fallbackErr;
          }
          session = await apiPost<AuthSession>('/api/auth/login', {
            account: loginAccount,
            username: loginAccount,
            password,
          });
        }
      }
      setAuthSession(session);
      navigate(postLoginPath);
    } catch (err) {
      handleError(err);
    } finally {
      setBusy(false);
    }
  };

  const handleRequestCode = async () => {
    if (!username.trim() || !email.trim() || !registerPassword.trim()) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await apiPost('/api/auth/register/request', {
        username: username.trim(),
        email: email.trim(),
        display_name: displayName.trim() || username.trim(),
        password: registerPassword,
      });
      setVerificationSent(true);
      setMessage(t('login.verification_sent_message'));
    } catch (err) {
      handleError(err);
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyAndRegister = async () => {
    if (!email.trim() || !verificationCode.trim()) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await apiPost<AuthSession>('/api/auth/register/verify', {
        email: email.trim(),
        code: verificationCode.trim(),
      });
      setMessage(t('login.registration_success_redirecting'));
      setTimeout(() => {
        setMode('login');
        setVerificationSent(false);
        setMessage('');
        setUsername('');
        setEmail('');
        setDisplayName('');
        setRegisterPassword('');
        setVerificationCode('');
      }, 3000);
    } catch (err) {
      handleError(err);
    } finally {
      setBusy(false);
    }
  };

  const inputClass =
    'w-full px-4 py-3 text-sm border border-zinc-200 rounded-xl bg-white text-zinc-900 placeholder:text-zinc-400 outline-none transition-all focus:border-purple-500 focus:ring-2 focus:ring-purple-500/15';

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-neutral-100 p-4">
      <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
        <LocaleSwitcher className="shadow-sm" />
      </div>

      <div className="w-full max-w-md space-y-8 rounded-3xl border border-zinc-100 bg-white p-8 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.12)] sm:p-10">
        <div className="flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-600 shadow-md">
            <div className="h-6 w-6 rotate-45 rounded-sm bg-white" />
          </div>
        </div>

        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-black">{t('login.welcome_to_pararouter')}</h1>
          <p className="text-sm text-zinc-500 sm:text-base">
            {mode === 'login' ? t('login.sign_in_to_continue') : t('login.create_your_account_with_email_verification')}
          </p>
        </div>

        <div className="grid grid-cols-2 rounded-full bg-zinc-100 p-1 text-sm font-semibold">
          <button
            type="button"
            className={`rounded-full px-3 py-2.5 transition-all ${mode === 'login' ? 'bg-white text-black shadow-sm' : 'text-zinc-500'}`}
            onClick={() => setMode('login')}
          >
            {t('login.login')}
          </button>
          <button
            type="button"
            className={`rounded-full px-3 py-2.5 transition-all ${mode === 'register' ? 'bg-white text-black shadow-sm' : 'text-zinc-500'}`}
            onClick={() => setMode('register')}
          >
            {t('login.register')}
          </button>
        </div>

        {mode === 'login' ? (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              void handleLogin();
            }}
          >
            <input value={account} onChange={(e) => setAccount(e.target.value)} placeholder={t('login.placeholder_username_or_email')} className={inputClass} autoComplete="username" />
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder={t('login.placeholder_login_password')} className={inputClass} autoComplete="current-password" />
            <button type="submit" disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-full bg-purple-600 px-6 py-3.5 font-semibold text-white shadow-sm transition-colors hover:bg-purple-500 disabled:opacity-60">
              <LogIn size={18} />
              {busy ? t('login.signing_in') : t('login.sign_in')}
            </button>
          </form>
        ) : (
          <div className="space-y-3">
            <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder={t('login.placeholder_username')} className={inputClass} autoComplete="username" />
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder={t('login.placeholder_email')} className={inputClass} autoComplete="email" />
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder={t('login.placeholder_display_name')} className={inputClass} autoComplete="name" />
            <input value={registerPassword} onChange={(e) => setRegisterPassword(e.target.value)} type="password" placeholder={t('login.placeholder_password')} className={inputClass} autoComplete="new-password" />
            {!verificationSent ? (
              <button type="button" onClick={handleRequestCode} disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-full bg-purple-600 px-6 py-3.5 font-semibold text-white shadow-sm transition-colors hover:bg-purple-500 disabled:opacity-60">
                <MailCheck size={18} />
                {busy ? t('login.sending_code') : t('login.send_verification_code')}
              </button>
            ) : (
              <>
                <input value={verificationCode} onChange={(e) => setVerificationCode(e.target.value)} placeholder={t('login.placeholder_verification_code')} className={inputClass} autoComplete="one-time-code" />
                <button type="button" onClick={handleVerifyAndRegister} disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-full bg-purple-600 px-6 py-3.5 font-semibold text-white shadow-sm transition-colors hover:bg-purple-500 disabled:opacity-60">
                  <UserPlus size={18} />
                  {busy ? t('login.creating_account') : t('login.verify_and_create_account')}
                </button>
              </>
            )}
          </div>
        )}

        <div className="min-h-[24px] flex flex-col justify-center">
          {message && <p className="text-sm text-emerald-600 text-center transition-all">{message}</p>}
          {error && <p className="text-sm text-red-600 text-center transition-all">{error}</p>}
        </div>
      </div>
    </div>
  );
}
