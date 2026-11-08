import { useEffect, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export async function api(path, options = {}) {
  const token = localStorage.getItem('remittrack-token');
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Bypass-Tunnel-Reminder': 'true',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers
      },
      body: options.body ? JSON.stringify(options.body) : undefined
    });
  } catch {
    throw new Error('Cannot reach the API. Check that MongoDB is configured and the server is running.');
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && path !== '/auth/login' && path !== '/auth/register') {
      localStorage.removeItem('remittrack-token');
      localStorage.removeItem('remittrack-user');
      window.dispatchEvent(new Event('smart-remittrack:session-expired'));
    }
    throw new Error(payload.message || 'The request could not be completed.');
  }
  if (typeof window !== 'undefined' && options.method && (
    path === '/transactions' || path.endsWith('/advance') || path.startsWith('/notifications')
  )) window.dispatchEvent(new Event('smart-remittrack:notifications-updated'));
  return payload;
}

export function useApiData(path, initialValue) {
  const [data, setData] = useState(initialValue);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    api(path).then((result) => {
      if (active) { setData(result); setError(''); }
    }).catch((requestError) => {
      if (active) setError(requestError.message);
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [path, revision]);
  useEffect(() => {
    if (path !== '/notifications') return undefined;
    const refreshNotifications = () => setRevision((value) => value + 1);
    window.addEventListener('smart-remittrack:notifications-updated', refreshNotifications);
    return () => window.removeEventListener('smart-remittrack:notifications-updated', refreshNotifications);
  }, [path]);
  return { data, loading, error, refresh: () => setRevision((value) => value + 1) };
}

export const money = (value, currency = 'USD', options = {}) => new Intl.NumberFormat('en-US', {
  style: 'currency', currency, maximumFractionDigits: options.decimals ?? 2,
  notation: options.compact ? 'compact' : 'standard'
}).format(Number(value) || 0);

export const dateTime = (value, style = 'medium') => value
  ? new Intl.DateTimeFormat('en-US', { dateStyle: style, timeStyle: style === 'short' ? 'short' : undefined }).format(new Date(value))
  : '—';
