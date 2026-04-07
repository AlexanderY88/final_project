import React from 'react';
import { Link } from 'react-router-dom';
import { getSessionExpiredState } from '../utils/session';

const SessionExpired: React.FC = () => {
  const message = getSessionExpiredState() || 'You are not logged in yet.';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-indigo-100 px-4 py-16 flex items-center justify-center">
      <div className="w-full max-w-lg rounded-3xl border border-indigo-100 bg-white/95 shadow-2xl p-8 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-600">
          <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v4m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z" />
          </svg>
        </div>

        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-600">Session Ended</p>
        <h1 className="mt-3 text-3xl font-bold text-gray-900">You are not logged in</h1>
        <p className="mt-4 text-base leading-7 text-gray-600">{message}</p>
        <p className="mt-2 text-sm text-gray-500">Please go to the login screen and sign in again.</p>

        <div className="mt-8">
          <Link
            to="/login"
            className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            Go To Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SessionExpired;