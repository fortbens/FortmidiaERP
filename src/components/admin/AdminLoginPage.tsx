import React, { useState } from 'react';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { FortMidiaLogo, OFFICIAL_FORTMIDIA_LOGO_URL } from '../FortMidiaLogo';

interface AdminLoginPageProps {
  logoUrl?: string;
  onAuthenticate: (username: string, password: string) => Promise<string | null> | string | null;
  onBack?: () => void;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({
  logoUrl,
  onAuthenticate,
  onBack,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const error = await onAuthenticate(username, password);
      if (error) {
        setErrorMessage(error);
        return;
      }
      setErrorMessage('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090B] text-zinc-100 flex flex-col items-center justify-center px-4 py-10 sm:px-6">
      <div className="w-full max-w-[400px] rounded-xl border border-white/10 bg-[#111114] p-7 sm:p-9">
        <div className="flex flex-col items-center text-center">
          <FortMidiaLogo
            src={logoUrl || OFFICIAL_FORTMIDIA_LOGO_URL}
            alt="FortMídia"
            className="h-[68px] sm:h-[82px]"
            rounded="xl"
          />
          <h1 className="mt-6 font-display text-xl font-semibold tracking-tight text-white">
            Acesso Administrativo
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="mt-7 space-y-4" noValidate>
          {errorMessage && (
            <div
              role="alert"
              className="rounded-lg border border-red-500/35 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-300"
            >
              {errorMessage}
            </div>
          )}

          <div>
            <label
              htmlFor="admin-login-username"
              className="block text-xs font-medium text-zinc-300 mb-1.5"
            >
              Usuário (nome simples ou e-mail)
            </label>
            <input
              id="admin-login-username"
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder="Ex.: emerson ou nome@fortmidia.com.br"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                if (errorMessage) setErrorMessage('');
              }}
              className="w-full min-h-[46px] rounded-lg border border-white/15 bg-[#09090B] px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-500 transition-colors focus:border-[#fa6607] focus:outline-none focus:ring-1 focus:ring-[#fa6607]"
            />
          </div>

          <div>
            <label
              htmlFor="admin-login-password"
              className="block text-xs font-medium text-zinc-300 mb-1.5"
            >
              Senha
            </label>
            <div className="relative">
              <input
                id="admin-login-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Digite sua senha"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMessage) setErrorMessage('');
                }}
                className="w-full min-h-[46px] rounded-lg border border-white/15 bg-[#09090B] pl-3.5 pr-11 py-2.5 text-sm text-white placeholder:text-zinc-500 transition-colors focus:border-[#fa6607] focus:outline-none focus:ring-1 focus:ring-[#fa6607]"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 inline-flex h-9 w-9 items-center justify-center rounded-md text-zinc-400 transition-colors hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fa6607] cursor-pointer"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 w-full min-h-[46px] rounded-lg bg-[#fa6607] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#e55a00] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fa6607] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111114] cursor-pointer"
          >
            {submitting ? 'Autenticando...' : 'Entrar'}
          </button>
        </form>
      </div>

      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="mt-6 inline-flex items-center gap-1.5 text-xs text-zinc-500 transition-colors hover:text-zinc-300 cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Voltar
        </button>
      )}
    </div>
  );
};
