import { useState } from 'react';
import { requestOtp, saveAuthToken, verifyOtp, type AuthUser } from '../services/api';

interface AuthPageProps {
  onAuthenticated: (user: AuthUser) => void | Promise<void>;
  authError: string | null;
}

export default function AuthPage({ onAuthenticated, authError }: AuthPageProps) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devOtp, setDevOtp] = useState<string | null>(null);

  const handleRequestOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await requestOtp(phoneNumber);
      setStep('otp');
      setDevOtp(response.data.devOtp || null);
    } catch {
      setError('Failed to request OTP. Check phone number format and backend availability.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await verifyOtp(phoneNumber, otp);
      saveAuthToken(response.data.token);
      await onAuthenticated(response.data.user);
    } catch {
      setError('OTP verification failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2>Phone Login</h2>
        <p>Sign in with OTP to access alerts, portfolio, watchlist, and notifications.</p>

        {(error || authError) && <div className="auth-error">{error || authError}</div>}

        {step === 'phone' ? (
          <form onSubmit={handleRequestOtp} className="auth-form">
            <label htmlFor="phone-number">Phone Number</label>
            <input
              id="phone-number"
              type="tel"
              placeholder="+8801XXXXXXXXX"
              value={phoneNumber}
              onChange={(event) => setPhoneNumber(event.target.value)}
              required
            />
            <button type="submit" disabled={loading}>
              {loading ? 'Sending OTP...' : 'Request OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="auth-form">
            <label htmlFor="otp">OTP</label>
            <input
              id="otp"
              type="text"
              inputMode="numeric"
              placeholder="123456"
              value={otp}
              onChange={(event) => setOtp(event.target.value)}
              required
            />
            {devOtp && (
              <div className="auth-dev-otp">
                Dev OTP: <strong>{devOtp}</strong>
              </div>
            )}
            <div className="auth-actions">
              <button type="button" onClick={() => setStep('phone')} disabled={loading}>
                Back
              </button>
              <button type="submit" disabled={loading}>
                {loading ? 'Verifying...' : 'Verify OTP'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
