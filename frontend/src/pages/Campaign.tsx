import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Send, Info, Pause, Play, Square, Trash2, Plus } from 'lucide-react';
import ProgressBar from '../components/ProgressBar';
import { useAuth } from '../context/AuthContext';

interface Lead {
    name: string;
    phone: string;
    city?: string;
    selected?: boolean;
}

interface CampaignProps {
    leads: Lead[];
}

const Campaign: React.FC<CampaignProps> = ({ leads }) => {
    const { user, session, socket } = useAuth();
    // Filtrar apenas os leads selecionados
    const selectedLeads = leads.filter(l => l.selected);
    const [templates, setTemplates] = useState<string[]>(['Olá {{nome_empresa}}, vi seu perfil em {{cidade}} e gostaria de conversar.']);
    const [delayUnit, setDelayUnit] = useState<'seconds' | 'minutes'>('seconds');
    const [minDelay, setMinDelay] = useState<string>('10');
    const [maxDelay, setMaxDelay] = useState<string>('30');
    const [sending, setSending] = useState(false);
    const [paused, setPaused] = useState(false);
    const [progress, setProgress] = useState<{ total: number; sent: number; currentLead: string; error?: string | null } | null>(null);
    const [logs, setLogs] = useState<{ lead: string; status: string; error?: string }[]>([]);

    useEffect(() => {
        if (!socket) return;

        const handleProgress = (data: any) => {
             console.log('Progress received', data);
             setProgress({
                total: data.total,
                sent: data.sent,
                currentLead: data.currentLead,
                error: data.error
            });
            setLogs(prev => [{ lead: data.currentLead, status: data.status, error: data.error }, ...prev.slice(0, 9)]);
            setSending(true);
        };

        const handleFinished = () => {
             console.log('Finished received');
             setSending(false);
             alert('Enviados concluídos!');
        };

        socket.on('outreach_progress', handleProgress);
        socket.on('outreach_finished', handleFinished);

        return () => {
            socket.off('outreach_progress', handleProgress);
            socket.off('outreach_finished', handleFinished);
        };
    }, [socket]);

    const getHeaders = () => ({
        'Authorization': `Bearer ${session?.access_token}`
    });

    const handleDelayChange = (setter: React.Dispatch<React.SetStateAction<string>>, value: string) => {
        // Máscara: permite apenas números
        const numericValue = value.replace(/\D/g, '');
        setter(numericValue);
    };

    const handleStartOutreach = async () => {
        if (!user) return;

        if (selectedLeads.length === 0) {
            alert('Selecione pelo menos um lead no Dashboard!');
            return;
        }

        const minVal = parseInt(minDelay) || 0;
        const maxVal = parseInt(maxDelay) || 0;
        const multiplier = delayUnit === 'minutes' ? 60 : 1;
        const finalMin = minVal * multiplier;
        const finalMax = maxVal * multiplier;

        if (finalMin < 1 || finalMax < finalMin) {
            alert('Configuração de intervalo inválida. Verifique os valores mínimo e máximo.');
            return;
        }

        setSending(true);
        setPaused(false);
        try {
            await axios.post('/api/whatsapp/outreach', {
                leads: selectedLeads,
                messageConfig: {
                    text: templates[0], // Fallback/Compatibilidade
                    templates: templates
                },
                delayConfig: {
                    min: finalMin,
                    max: finalMax
                }
            }, { headers: getHeaders() });
        } catch (error: any) {
            alert(error.response?.data?.error || 'Erro ao iniciar disparos');
            console.error(error);
            setSending(false);
        }
    };

    const handlePause = async () => {
        try {
            await axios.post('/api/whatsapp/pause', {}, { headers: getHeaders() });
            setPaused(true);
        } catch (error) {
            console.error('Erro ao pausar:', error);
        }
    };

    const handleResume = async () => {
        try {
            await axios.post('/api/whatsapp/resume', {}, { headers: getHeaders() });
            setPaused(false);
        } catch (error) {
            console.error('Erro ao retomar:', error);
        }
    };

    const handleStop = async () => {
        if (!confirm('Tem certeza que deseja parar todos os disparos?')) return;
        try {
            await axios.post('/api/whatsapp/stop', {}, { headers: getHeaders() });
            setSending(false);
            setPaused(false);
            setProgress(null);
        } catch (error) {
            console.error('Erro ao parar:', error);
        }
    };

    return (
        <div className="campaign-page">
            <header className="page-header">
                <h1>Configurar Campanha</h1>
                <p>Personalize sua mensagem e inicie os disparos automáticos.</p>
            </header>

            <div className="campaign-grid">
                <div className="config-section">
                    <div className="card">
                        <div className="input-group">
                            <label>Modelos de Mensagem (Rotação Automática)</label>

                            {templates.map((template, index) => (
                                <div key={index} style={{ marginBottom: '15px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                        <span style={{ fontSize: '12px', color: '#666' }}>Modelo {index + 1}</span>
                                        {templates.length > 1 && (
                                            <button
                                                onClick={() => setTemplates(templates.filter((_, i) => i !== index))}
                                                style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#d32f2f' }}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>
                                    <textarea
                                        rows={4}
                                        value={template}
                                        onChange={(e) => {
                                            const newTemplates = [...templates];
                                            newTemplates[index] = e.target.value;
                                            setTemplates(newTemplates);
                                        }}
                                        placeholder="Digite sua mensagem aqui..."
                                        style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd' }}
                                    ></textarea>
                                </div>
                            ))}

                            <button
                                onClick={() => setTemplates([...templates, ''])}
                                className="btn"
                                style={{ marginTop: '5px', fontSize: '12px', padding: '5px 10px', background: '#e0e0e0' }}
                            >
                                <Plus size={14} /> Adicionar Novo Modelo
                            </button>

                            <div className="variables-hint" style={{ marginTop: '10px' }}>
                                <Info size={14} />
                                <span>Variáveis: <strong>{"{{nome_empresa}}"}</strong>, <strong>{"{{cidade}}"}</strong></span>
                            </div>
                        </div>

                        <div className="input-group" style={{ marginTop: '20px', background: '#fff', border: '1px solid #eee', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                <label style={{ margin: 0, fontWeight: 600, color: '#333', fontSize: '14px' }}>Intervalo de Disparo</label>
                                <select 
                                    value={delayUnit} 
                                    onChange={(e) => setDelayUnit(e.target.value as 'seconds' | 'minutes')}
                                    style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '13px', outline: 'none', background: '#fff', cursor: 'pointer', fontWeight: 500 }}
                                >
                                    <option value="seconds">Em Segundos</option>
                                    <option value="minutes">Em Minutos</option>
                                </select>
                            </div>

                            <div style={{ display: 'flex', gap: '15px' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>Mínimo</label>
                                    <div style={{ display: 'flex', alignItems: 'center', background: '#fff', border: '1px solid #ddd', borderRadius: '6px', overflow: 'hidden' }}>
                                        <input
                                            type="text"
                                            value={minDelay}
                                            onChange={(e) => handleDelayChange(setMinDelay, e.target.value)}
                                            className="form-input"
                                            placeholder="Ex: 10"
                                            style={{ width: '100%', padding: '10px 12px', border: 'none', outline: 'none', fontSize: '14px', background: 'transparent' }}
                                        />
                                        <span style={{ padding: '10px 12px', color: '#666', background: '#f8f9fa', borderLeft: '1px solid #ddd', fontSize: '13px', fontWeight: 500 }}>
                                            {delayUnit === 'seconds' ? 'seg' : 'min'}
                                        </span>
                                    </div>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>Máximo</label>
                                    <div style={{ display: 'flex', alignItems: 'center', background: '#fff', border: '1px solid #ddd', borderRadius: '6px', overflow: 'hidden' }}>
                                        <input
                                            type="text"
                                            value={maxDelay}
                                            onChange={(e) => handleDelayChange(setMaxDelay, e.target.value)}
                                            className="form-input"
                                            placeholder="Ex: 30"
                                            style={{ width: '100%', padding: '10px 12px', border: 'none', outline: 'none', fontSize: '14px', background: 'transparent' }}
                                        />
                                        <span style={{ padding: '10px 12px', color: '#666', background: '#f8f9fa', borderLeft: '1px solid #ddd', fontSize: '13px', fontWeight: 500 }}>
                                            {delayUnit === 'seconds' ? 'seg' : 'min'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <p style={{ fontSize: '12px', color: '#888', marginTop: '12px', display: 'flex', alignItems: 'flex-start', gap: '6px', lineHeight: '1.4' }}>
                                <Info size={14} style={{ flexShrink: 0, marginTop: '2px' }}/> 
                                O sistema vai aguardar um tempo aleatório entre os dois valores informados antes de enviar de fato a próxima mensagem. Isso simula comportamento humano e reduz as chances de banimento da conta.
                            </p>
                        </div>

                        <div className="stats-info">
                            <p>Leads Selecionados: <strong>{selectedLeads.length}</strong></p>
                            {logs.length > 0 && (
                                <div className="logs-section" style={{ marginTop: '20px', padding: '15px', background: '#f8f9fa', borderRadius: '8px' }}>
                                    <h4 style={{ marginBottom: '10px' }}>Logs em Tempo Real</h4>
                                    <div className="log-list" style={{ maxHeight: '150px', overflowY: 'auto', fontSize: '13px' }}>
                                        {logs.map((log, i) => (
                                            <div key={i} style={{ padding: '5px 0', borderBottom: '1px solid #eee', color: log.status === 'success' ? '#2e7d32' : '#d32f2f' }}>
                                                <strong>{log.lead}</strong>: {log.status === 'success' ? 'Enviado ✅' : `Falha ❌ (${log.error})`}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="action-buttons" style={{ display: 'flex', gap: '10px' }}>
                            {!sending ? (
                                <button
                                    className="btn btn-primary btn-large"
                                    onClick={handleStartOutreach}
                                    disabled={selectedLeads.length === 0}
                                    style={{ flex: 1 }}
                                >
                                    <Send size={18} />
                                    Iniciar Disparos
                                </button>
                            ) : (
                                <>
                                    {!paused ? (
                                        <button className="btn btn-warning" onClick={handlePause} style={{ flex: 1 }}>
                                            <Pause size={18} /> Pausar
                                        </button>
                                    ) : (
                                        <button className="btn btn-success" onClick={handleResume} style={{ flex: 1 }}>
                                            <Play size={18} /> Retomar
                                        </button>
                                    )}
                                    <button className="btn btn-error" onClick={handleStop} style={{ flex: 1 }}>
                                        <Square size={18} /> Parar
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="preview-section">
                    <h3>Visualização da Mensagem</h3>
                    <div className="whatsapp-preview">
                        <div className="preview-bubble">
                            {templates[0].replace(/{{nome_empresa}}/g, 'Empresa Exemplo').replace(/{{cidade}}/g, 'São Paulo')}
                        </div>
                    </div>
                </div>
            </div>

            {progress && (
                <div className="progress-section">
                    <ProgressBar
                        total={progress.total}
                        sent={progress.sent}
                        currentLead={progress.currentLead}
                    />
                </div>
            )}
        </div>
    );
};

export default Campaign;
