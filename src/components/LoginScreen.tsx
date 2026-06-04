import { useState } from 'react';
import { DEFAULT_USERS } from '@/constants';
import { useAppStore } from '@/store';
import { loginSimple } from '@/firebase/auth';
import type { UserId } from '@/types';

export function LoginScreen() {
  const [selected, setSelected] = useState<UserId | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const setUser = useAppStore(s => s.setUser);

  async function handleSubmit() {
    if (!selected) return;
    setError(null);
    setBusy(true);
    try {
      await loginSimple(selected, pin);
      const userInfo = DEFAULT_USERS.find(u => u.id === selected)!;
      await setUser({ id: userInfo.id, name: userInfo.name, email: userInfo.email });
    } catch (e: any) {
      setError(e?.message ?? 'Error al iniciar sesión.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <h1>Sermon Maker Pro</h1>
        <p>Elige tu usuario para comenzar</p>
        <div className="user-buttons">
          {DEFAULT_USERS.map(u => (
            <button
              key={u.id}
              className={`user-btn ${selected === u.id ? 'active' : ''}`}
              onClick={() => { setSelected(u.id); setPin(''); setError(null); }}
            >{u.name}</button>
          ))}
        </div>
        {selected && (
          <>
            <input
              className="pin-input"
              type="password"
              inputMode="numeric"
              autoFocus
              maxLength={8}
              placeholder="PIN"
              value={pin}
              onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
              onKeyDown={e => { if (e.key === 'Enter') void handleSubmit(); }}
            />
            {error && <div className="login-error">{error}</div>}
            <div className="row" style={{ marginTop: 18, justifyContent: 'center' }}>
              <button className="primary-btn" disabled={!pin || busy} onClick={handleSubmit}>
                {busy ? 'Ingresando…' : 'Entrar'}
              </button>
            </div>
            <p style={{ marginTop: 14, fontSize: 12, color: 'var(--text-muted)' }}>
              La primera vez, tu PIN quedará registrado de forma privada.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
