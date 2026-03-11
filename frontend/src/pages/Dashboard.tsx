import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, Globe, Phone, Star, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface Lead {
    name: string;
    category: string;
    address: string;
    phone: string;
    whatsapp: string;
    website: string;
    rating: number;
    reviews: number;
    operating_hours: string;
    google_link: string;
    selected?: boolean;
}

interface DashboardProps {
    leads: Lead[];
    setLeads: React.Dispatch<React.SetStateAction<Lead[]>>;
}

const Dashboard: React.FC<DashboardProps> = ({ leads, setLeads }) => {
    const navigate = useNavigate();
    const { session } = useAuth();
    const [niche, setNiche] = useState('');
    const [city, setCity] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/leads`, {
                params: { niche, city },
                headers: { 'Authorization': `Bearer ${session?.access_token}` }
            });
            const results = response.data.map((l: any) => ({ ...l, selected: true }));
            setLeads(results);
        } catch (error: any) {
            const errorMsg = error.response?.data?.details || error.response?.data?.error || error.message;
            alert(`Erro na busca: ${errorMsg}`);
        } finally {
            setLoading(false);
        }
    };

    const toggleLead = (index: number) => {
        const newLeads = [...leads];
        newLeads[index].selected = !newLeads[index].selected;
        setLeads(newLeads);
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newLeads = leads.map(l => ({ ...l, selected: e.target.checked }));
        setLeads(newLeads);
    };

    const allSelected = leads.length > 0 && leads.every(l => l.selected);
    const selectedCount = leads.filter(l => l.selected).length;

    return (
        <div className="dashboard-page">
            <header className="page-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <div>
                        <h1>Buscar Novos Leads</h1>
                        <p>Informe o nicho e a cidade para encontrar empresas no Google Maps.</p>
                    </div>
                    {selectedCount > 0 && (
                        <button
                            className="btn btn-primary"
                            onClick={() => navigate('/campaign')}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', animation: 'fadeIn 0.3s ease' }}
                        >
                            Configurar Campanha ({selectedCount}) <ArrowRight size={18} />
                        </button>
                    )}
                </div>
            </header>

            <form className="search-form card" onSubmit={handleSearch}>
                <div className="input-group">
                    <label>Nicho / Ramo de Atividade</label>
                    <div className="input-with-icon">
                        <Search size={18} />
                        <input
                            type="text"
                            placeholder="Ex: Serralheria, Dentista, Pizzaria"
                            value={niche}
                            onChange={(e) => setNiche(e.target.value)}
                            required
                        />
                    </div>
                </div>
                <div className="input-group">
                    <label>Cidade</label>
                    <div className="input-with-icon">
                        <MapPin size={18} />
                        <input
                            type="text"
                            placeholder="Ex: São Paulo, Rio de Janeiro"
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            required
                        />
                    </div>
                </div>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? 'Buscando...' : 'Buscar Leads'}
                </button>
            </form>

            {leads.length > 0 && (
                <div className="results-section">
                    <div className="results-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h2>Principais Empresas Encontradas</h2>
                        <label className="select-all" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '500', background: 'var(--bg-secondary)', padding: '8px 16px', borderRadius: '8px' }}>
                            <input
                                type="checkbox"
                                checked={allSelected}
                                onChange={handleSelectAll}
                            />
                            Selecionar Todos ({leads.length})
                        </label>
                    </div>
                    <div className="leads-grid" style={{ position: 'relative' }}>
                        {leads.map((lead, index) => (
                            <div
                                key={index}
                                className={`lead-card card ${lead.selected ? 'selected' : ''}`}
                                style={{
                                    position: 'relative',
                                    border: lead.selected ? '2px solid var(--primary-color)' : '1px solid var(--border-color)',
                                    transition: 'all 0.2s ease',
                                    paddingTop: '2.5rem'
                                }}
                            >
                                <input
                                    type="checkbox"
                                    checked={lead.selected}
                                    onChange={() => toggleLead(index)}
                                    style={{
                                        position: 'absolute',
                                        top: '15px',
                                        left: '15px',
                                        width: '18px',
                                        height: '18px',
                                        cursor: 'pointer',
                                        zIndex: 2
                                    }}
                                />
                                <div className="lead-header" style={{ marginBottom: '12px' }}>
                                    <div style={{ flex: 1 }}>
                                        <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{lead.name}</h3>
                                        <span className="badge" style={{ marginTop: '5px', display: 'inline-block' }}>{lead.category}</span>
                                    </div>
                                </div>
                                <div className="lead-body">
                                    <p style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '0.9rem' }}>
                                        <MapPin size={14} color="var(--text-secondary)" /> {lead.address}
                                    </p>
                                    <p style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '0.9rem' }}>
                                        <Phone size={14} color="var(--text-secondary)" /> {lead.phone || 'Telefone não informado'}
                                    </p>
                                    {lead.website && (
                                        <p style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '0.9rem' }}>
                                            <Globe size={14} color="var(--text-secondary)" />
                                            <a href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`} target="_blank" rel="noreferrer" className="website-link" style={{ color: 'var(--primary-color)', fontWeight: '500', textDecoration: 'none' }}>
                                                Visitar Website
                                            </a>
                                        </p>
                                    )}
                                    <div className="lead-footer" style={{ marginTop: '1.2rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span className="rating" style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.85rem' }}>
                                            <Star size={14} fill="#fbaf00" color="#fbaf00" />
                                            {lead.rating} <span style={{ color: 'var(--text-secondary)' }}>({lead.reviews})</span>
                                        </span>
                                        <a href={lead.google_link} target="_blank" rel="noreferrer" className="maps-link" style={{ fontSize: '0.8rem', color: 'var(--primary-color)', textDecoration: 'none', fontWeight: '500' }}>
                                            Google Maps
                                        </a>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
