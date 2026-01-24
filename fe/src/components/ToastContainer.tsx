import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { useToastStore, type Toast } from '../store/toastStore';

const icons = {
    success: CheckCircle,
    error: AlertCircle,
    info: Info,
    warning: AlertTriangle,
};

const colors = {
    success: { bg: '#10b981', color: '#fff', border: '#059669' },
    error: { bg: '#ef4444', color: '#fff', border: '#b91c1c' },
    info: { bg: '#3b82f6', color: '#fff', border: '#1d4ed8' },
    warning: { bg: '#f59e0b', color: '#fff', border: '#b45309' },
};

function ToastItem({ toast }: { toast: Toast }) {
    const { removeToast } = useToastStore();
    const Icon = icons[toast.type];
    const colorScheme = colors[toast.type];

    return (
        <div
            className="toast-item"
            style={{
                background: colorScheme.bg,
                color: colorScheme.color,
                borderColor: colorScheme.border,
            }}
        >
            <Icon size={18} style={{ color: colorScheme.color, flexShrink: 0 }} />
            <span className="toast-message">{toast.message}</span>
            <button
                className="toast-close"
                onClick={() => removeToast(toast.id)}
                style={{ color: colorScheme.color }}
            >
                <X size={14} />
            </button>
        </div>
    );
}

export function ToastContainer() {
    const { toasts } = useToastStore();

    if (toasts.length === 0) return null;

    return (
        <div className="toast-container">
            {toasts.map((toast) => (
                <ToastItem key={toast.id} toast={toast} />
            ))}

            <style>{`
                .toast-container {
                    position: fixed;
                    top: 20px;
                    left: 50%;
                    transform: translateX(-50%);
                    z-index: 99999;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    max-width: 400px;
                    width: 90%;
                }

                .toast-item {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 12px 20px;
                    border: 1px solid transparent;
                    border-radius: 8px;
                    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
                    animation: slideDown 0.3s ease;
                }

                @keyframes slideDown {
                    from {
                        opacity: 0;
                        transform: translateY(-20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                .toast-message {
                    flex: 1;
                    font-size: 14px;
                    color: inherit;
                    font-weight: 600;
                }

                .toast-close {
                    background: transparent;
                    border: none;
                    color: var(--text-muted);
                    cursor: pointer;
                    padding: 4px;
                    display: flex;
                    border-radius: 4px;
                    transition: all 0.2s;
                }

                .toast-close:hover {
                    background: var(--bg-tertiary);
                    color: var(--text-primary);
                }
            `}</style>
        </div>
    );
}
