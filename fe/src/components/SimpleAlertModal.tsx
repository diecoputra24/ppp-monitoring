import { createPortal } from 'react-dom';
import { X, AlertCircle } from 'lucide-react';

interface SimpleAlertModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    message: string;
    type?: 'warning' | 'error' | 'info';
}

export function SimpleAlertModal({ isOpen, onClose, title, message, type = 'warning' }: SimpleAlertModalProps) {
    if (!isOpen) return null;

    const getIcon = () => {
        switch (type) {
            case 'error': return <AlertCircle className="text-danger" size={20} />;
            case 'info': return <AlertCircle className="text-info" size={20} />;
            default: return <AlertCircle className="text-warning" size={20} />;
        }
    };

    return createPortal(
        <div className="modal-overlay" style={{ zIndex: 10000, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'none' }}>
            <div className="modal simple-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header-simple">
                    <div className="modal-title-simple">
                        {getIcon()}
                        <span>{title}</span>
                    </div>
                    <button className="close-btn-simple" onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>

                <div className="modal-body-simple">
                    <p style={{ fontSize: '14px', color: 'var(--text-primary)', lineHeight: '1.5', margin: 0 }}>
                        {message}
                    </p>
                </div>

                <div className="modal-footer-simple">
                    <button type="button" className="btn btn-primary" onClick={onClose} style={{ minWidth: '80px' }}>
                        OK
                    </button>
                </div>

                <style>{`
                    .simple-modal {
                        background: var(--bg-secondary);
                        border: 1px solid var(--border-color);
                        border-radius: 4px;
                        width: 90%;
                        max-width: 380px;
                        box-shadow: 0 10px 25px rgba(0,0,0,0.2);
                        animation: modalFadeIn 0.2s ease-out;
                    }

                    @keyframes modalFadeIn {
                        from { opacity: 0; transform: translateY(-10px); }
                        to { opacity: 1; transform: translateY(0); }
                    }

                    .modal-header-simple {
                        padding: 16px;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        border-bottom: 1px solid var(--border-color);
                    }

                    .modal-title-simple {
                        display: flex;
                        align-items: center;
                        gap: 10px;
                        font-weight: 600;
                        font-size: 15px;
                        color: var(--text-primary);
                    }

                    .close-btn-simple {
                        background: transparent;
                        border: none;
                        color: var(--text-muted);
                        cursor: pointer;
                        padding: 4px;
                        display: flex;
                    }
                    .close-btn-simple:hover { color: var(--danger); }

                    .modal-body-simple { padding: 20px 16px; }

                    .modal-footer-simple {
                        padding: 12px 16px;
                        display: flex;
                        justify-content: flex-end;
                        border-top: 1px solid var(--border-color);
                        background: rgba(0,0,0,0.02);
                    }
                `}</style>
            </div>
        </div>,
        document.body
    );
}
