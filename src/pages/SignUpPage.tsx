import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { DEPARTMENTS } from '../data/seedData';
import { SrhLogo } from '../components/SrhLogo';
import { HOME_ROUTE } from '../types/models';

const Field: React.FC<{ id: string; label: string; children: React.ReactNode }> = ({
  id,
  label,
  children,
}) => (
  <div className="flex flex-col">
    <label
      htmlFor={id}
      className="text-[14px] leading-[20px] text-[#575756] mx-[10px] mb-[5px] inline-flex items-center"
    >
      <span>{label}</span>
      <span className="text-[#D54407] ml-0.5 font-bold">*</span>
    </label>
    {children}
  </div>
);

export const SignUpPage: React.FC = () => {
  const { signUpStudent } = useApp();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [matriculationNumber, setMatriculationNumber] = useState('');
  const [department, setDepartment] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setBusy(true);
    const res = await signUpStudent({ name, email, matriculationNumber, department, password });
    setBusy(false);
    if (!res.ok || !res.data) {
      setError(res.error || 'Sign-up failed.');
      return;
    }
    navigate(HOME_ROUTE[res.data.role]);
  };

  return (
    <div className="min-h-screen bg-[#F5F4F3] text-[#575756] flex flex-col">
      <div className="h-1 w-full bg-gradient-to-r from-[#D54407] via-[#D54407] to-[#37484E] shrink-0" />
      <header className="bg-white h-[68px] px-4 sm:px-8 flex items-center shadow-[1px_1px_1px_1px_rgba(0,0,0,0.05)]">
        <Link to="/login" aria-label="Back to login">
          <SrhLogo variant="dark-text" subtitle="system" />
        </Link>
      </header>

      <main className="flex-1 flex items-start justify-center px-4 py-10">
        <div className="w-full max-w-[480px] bg-white rounded-[20px_20px_20px_0px] shadow-[0_24px_60px_rgba(0,0,0,0.15)] border border-[#DDDAD8] p-7 sm:p-9">
          <span className="srh-overline block mb-1.5">mySRH Campus Portal • Sign up</span>
          <h1 className="font-srh-headline text-[28px] leading-[34px] font-bold text-[#171717]">
            Create your Account
          </h1>
          <p className="text-[15px] leading-[22px] text-[#575756] mt-1 mb-6">
            Students register once, then log in with their matriculation number.
          </p>

          {error && (
            <div
              role="alert"
              className="mb-5 p-3.5 rounded-[10px] bg-red-50 border border-[#E60000]/40 flex items-start gap-2.5 text-[13px] text-[#B91C1C]"
            >
              <AlertCircle className="w-4 h-4 text-[#E60000] shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <Field id="su-name" label="Full name">
              <input
                id="su-name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="First and last name"
                required
                className="srh-textinput"
              />
            </Field>

            <Field id="su-email" label="SRH email address">
              <input
                id="su-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@srh-berlin.de"
                required
                className="srh-textinput"
              />
            </Field>

            <Field id="su-matric" label="Matriculation number">
              <input
                id="su-matric"
                type="text"
                inputMode="numeric"
                autoComplete="username"
                value={matriculationNumber}
                onChange={(e) => setMatriculationNumber(e.target.value)}
                placeholder="e.g. 1100421"
                required
                className="srh-textinput"
              />
            </Field>

            <Field id="su-dept" label="Department / study programme">
              <select
                id="su-dept"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                required
                className="srh-textinput"
              >
                <option value="" disabled>
                  Select your programme
                </option>
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </Field>

            <Field id="su-password" label="Password (min. 8 characters)">
              <div className="relative">
                <input
                  id="su-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="srh-textinput pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 px-4 flex items-center text-[#575756] hover:text-[#171717] cursor-pointer"
                  aria-label={showPassword ? 'Hide passwords' : 'Show passwords'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </Field>

            <Field id="su-confirm" label="Repeat password">
              <input
                id="su-confirm"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                className="srh-textinput"
              />
            </Field>

            <button
              type="submit"
              disabled={busy}
              className="srh-btn-primary w-full cursor-pointer mt-1 disabled:opacity-60"
            >
              {busy ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="mt-5 text-[14px] text-center">
            Already registered?{' '}
            <Link
              to="/login"
              className="font-bold text-[#171717] hover:text-[#C12D00] underline underline-offset-2"
            >
              Log in
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
};
