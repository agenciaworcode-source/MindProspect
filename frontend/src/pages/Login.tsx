import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, User } from 'lucide-react';

const Login: React.FC = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        if (!name.trim()) {
          setError('Nome é obrigatório');
          setLoading(false);
          return;
        }
        const result = await register(name.trim(), email, password);
        if (result.error) {
          setError(result.error);
        }
      } else {
        const result = await login(email, password);
        if (result.error) {
          setError(result.error);
        }
      }
    } catch {
      setError('Erro inesperado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    padding: '0.75rem 0.75rem 0.75rem 2.5rem',
    borderRadius: '6px',
    border: '1px solid var(--border-color)',
    background: 'var(--bg-light)',
    color: 'var(--text-main)',
    fontSize: '1rem',
    width: '100%',
  };

  const iconStyle: React.CSSProperties = {
    position: 'absolute',
    left: '0.75rem',
    top: '50%',
    transform: 'translateY(-50%)',
    color: 'var(--text-muted)',
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      backgroundColor: 'var(--bg-light)',
      color: 'var(--text-main)',
    }}>
      <div style={{
        background: 'var(--bg-white)',
        padding: '2.5rem',
        borderRadius: '12px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        width: '100%',
        maxWidth: '420px',
        textAlign: 'center',
        border: '1px solid var(--border-color)',
      }}>
        <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.8rem' }}>
          <img src="/logo-icon-1.svg" alt="MindProspect Icon" style={{ height: '36px' }} />
          <img src="/logo-text.svg" alt="MindProspect" style={{ height: '28px' }} />
        </div>

        <p style={{ marginBottom: '2rem', color: 'var(--text-muted)' }}>
          {isRegister ? 'Crie sua conta para acessar a plataforma' : 'Acesse sua conta para gerenciar campanhas'}
        </p>

        {error && (
          <div style={{
            background: '#fee2e2',
            color: '#991b1b',
            padding: '0.75rem',
            borderRadius: '6px',
            marginBottom: '1rem',
            fontSize: '0.875rem',
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {isRegister && (
            <div style={{ position: 'relative' }}>
              <User size={18} style={iconStyle} />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome"
                style={inputStyle}
                required
              />
            </div>
          )}

          <div style={{ position: 'relative' }}>
            <Mail size={18} style={iconStyle} />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              style={inputStyle}
              required
            />
          </div>

          <div style={{ position: 'relative' }}>
            <Lock size={18} style={iconStyle} />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Senha"
              style={inputStyle}
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '0.75rem',
              borderRadius: '6px',
              border: 'none',
              background: loading ? 'var(--border-color)' : 'var(--primary)',
              color: 'white',
              fontSize: '1rem',
              fontWeight: 'bold',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s',
            }}
          >
            {loading ? 'Aguarde...' : isRegister ? 'Criar Conta' : 'Entrar'}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem' }}>
          <button
            onClick={() => { setIsRegister(!isRegister); setError(''); }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--primary)',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500',
            }}
          >
            {isRegister ? 'Já tenho uma conta → Entrar' : 'Não tenho conta → Criar Conta'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
