import React from 'react';

interface ProgressBarProps {
    total: number;
    sent: number;
    currentLead: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ total, sent, currentLead }) => {
    const percentage = Math.round((sent / total) * 100);

    return (
        <div className="progress-container card">
            <div className="progress-header">
                <h3>Progresso do Disparo</h3>
                <span className="percentage">{percentage}%</span>
            </div>
            <div className="progress-bar-bg">
                <div
                    className="progress-bar-fill"
                    style={{ width: `${percentage}%` }}
                ></div>
            </div>
            <div className="progress-footer">
                <p>Enviados: <strong>{sent}</strong> de {total}</p>
                {currentLead && <p>Enviando para: <strong>{currentLead}</strong></p>}
            </div>
        </div>
    );
};

export default ProgressBar;
