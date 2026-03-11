import { useEffect, useState } from 'react';
import { Smartphone, CheckCircle, XCircle, RefreshCw, Power } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Connection = () => {
    const { user, session, socket } = useAuth();
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [status, setStatus] = useState<'disconnected' | 'connected' | 'qr_ready'>('disconnected');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!user || !session) return;

        // Obter status inicial com JWT
        fetch(`${import.meta.env.VITE_API_URL}/api/whatsapp/status`, {
            headers: { 'Authorization': `Bearer ${session.access_token}` }
        })
            .then(res => res.json())
            .then(data => {
                setStatus(data.status);
                if (data.qr) setQrCode(data.qr);
            })
            .catch(err => console.error("Erro ao buscar status:", err));

        if (!socket) return;

        const handleQr = (qr: string) => {
            console.log('QR recebido via socket');
            setQrCode(qr);
            setStatus('qr_ready');
            setLoading(false);
        };

        const handleStatus = (newStatus: any) => {
            console.log('Status recebido via socket:', newStatus);
            setStatus(newStatus);
            if (newStatus === 'connected') {
                setQrCode(null);
                setLoading(false);
            }
        };

        socket.on('whatsapp_qr', handleQr);
        socket.on('whatsapp_status', handleStatus);

        return () => {
            socket.off('whatsapp_qr', handleQr);
            socket.off('whatsapp_status', handleStatus);
        };
    }, [socket, user, session]);

    const handleConnect = async () => {
        if (!user || !session) return;
        setLoading(true);
        try {
            await fetch(`${import.meta.env.VITE_API_URL}/api/whatsapp/connect`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });
            // O socket cuidará do resto
        } catch (error) {
            console.error('Erro ao conectar:', error);
            setLoading(false);
        }
    };

    const handleDisconnect = async () => {
        if (!user || !session) return;
        try {
            await fetch(`${import.meta.env.VITE_API_URL}/api/whatsapp/logout`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });
        } catch (error) {
            console.error('Erro ao desconectar:', error);
        }
    };

    const renderStatus = () => {
        switch (status) {
            case 'connected':
                return (
                    <div className="status-badge success">
                        <CheckCircle size={20} />
                        <span>WhatsApp Conectado</span>
                    </div>
                );
            case 'qr_ready':
                return (
                    <div className="status-badge warning">
                        <RefreshCw size={20} className="spin" />
                        <span>Aguardando Leitura do QR Code</span>
                    </div>
                );
            default:
                return (
                    <div className="status-badge error">
                        <XCircle size={20} />
                        <span>WhatsApp Desconectado</span>
                    </div>
                );
        }
    };

    return (
        <div className="connection-page">
            <header className="page-header">
                <h1>Conexão WhatsApp</h1>
                <p>Gerencie a conexão do seu número de WhatsApp para os disparos.</p>
            </header>

            <div className="connection-content card">
                <div className="connection-info">
                    <Smartphone size={48} color="var(--primary)" />
                    <div className="status-container">
                        {renderStatus()}
                    </div>
                </div>

                {status === 'qr_ready' && qrCode && (
                    <div className="qr-container">
                        <div style={{ background: 'white', padding: '1rem', borderRadius: '8px' }}>
                            <img
                                src={qrCode.startsWith('data:') ? qrCode : `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrCode)}`}
                                alt="WhatsApp QR Code"
                                onError={(e) => console.error("Erro ao carregar imagem QR", e)}
                            />
                        </div>
                        <p>Abra o WhatsApp no seu celular, vá em <strong>Aparelhos Conectados</strong> {'>'} <strong>Conectar Aparelho</strong> e escaneie este código.</p>
                        
                        <button 
                            onClick={handleDisconnect} 
                            style={{ 
                                marginTop: '1rem', 
                                padding: '0.6rem 1.2rem', 
                                borderRadius: '6px', 
                                border: '1px solid #ef4444', 
                                background: 'transparent', 
                                color: '#ef4444', 
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                                transition: 'all 0.2s ease',
                            }}
                        >
                            Cancelar Geração
                        </button>
                    </div>
                )}

                {status === 'connected' && (
                    <div className="connected-msg">
                        <h3>Tudo pronto!</h3>
                        <p>Seu WhatsApp está emparelhado e pronto para enviar mensagens.</p>
                        <button 
                            onClick={handleDisconnect} 
                            style={{ 
                                marginTop: '1rem', 
                                padding: '0.75rem 1.5rem', 
                                borderRadius: '6px', 
                                border: '1px solid #ef4444', 
                                background: 'transparent', 
                                color: '#ef4444', 
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                margin: '1rem auto' 
                            }}
                        >
                            <Power size={18} />
                            Desconectar
                        </button>
                    </div>
                )}

                {status === 'disconnected' && !qrCode && (
                    <div className="action-area" style={{ marginTop: '2rem', textAlign: 'center' }}>
                        <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                            Clique abaixo para gerar um novo QR Code e conectar seu aparelho.
                        </p>
                        <button 
                            onClick={handleConnect}
                            disabled={loading}
                            style={{
                                padding: '0.75rem 2rem',
                                borderRadius: '6px',
                                border: 'none',
                                background: loading ? 'var(--border-color)' : 'var(--primary)',
                                color: 'white',
                                fontSize: '1rem',
                                fontWeight: 'bold',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}
                        >
                            {loading ? <RefreshCw className="spin" size={20} /> : <RefreshCw size={20} />}
                            {loading ? 'Gerando...' : 'Gerar QR Code'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Connection;
