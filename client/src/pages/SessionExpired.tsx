import React from 'react';
import { Link } from 'react-router-dom';
import { getSessionExpiredState } from '../utils/session';

const SessionExpired: React.FC = () => {
  const message = getSessionExpiredState() || 'You are not logged in yet.';

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-white to-indigo-100 px-4 py-16 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950">
      <div className="w-full max-w-lg rounded-3xl border border-indigo-100 bg-white/95 p-8 text-center shadow-2xl dark:border-slate-700 dark:bg-slate-900/95">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-300">
          <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="8" strokeWidth={1.8} />
            <path strokeLinecap="round" strokeWidth={2} d="M9.2 10.3h.01M14.8 10.3h.01" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8.7 16.2c1-1.5 2.1-2.2 3.3-2.2s2.3.7 3.3 2.2" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M17.7 6.6l1.8-1.8" />
          </svg>
        </div>

        <h1 className="mt-3 text-3xl font-bold text-slate-900 dark:text-slate-100">You are not logged in</h1>
        <p className="mt-4 text-base leading-7 text-slate-700 dark:text-slate-300">{message}</p>

        <div className="mt-8">
          <Link
            to="/login"
            className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400"
          >
            Go To Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SessionExpired;