import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, MessageSquare, Save, Activity } from 'lucide-react';
import { useRouterStore } from '../store/routerStore';
import { type PPPUser } from '../api';

interface PPPUserCommentModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: PPPUser | null;
}

export function PPPUserCommentModal({ isOpen, onClose, user }: PPPUserCommentModalProps) {
    const { updatePPPComment, loading } = useRouterStore();
    const [comment, setComment] = useState('');

    useEffect(() => {
        if (isOpen && user) {
            setComment(user.comment || '');
        }
    }, [isOpen, user]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        try {
            await updatePPPComment(user.name, comment, user.id);
            onClose();
        } catch (error) {
            console.error('Failed to update comment:', error);
        }
    };

    if (!isOpen || !user) return null;

    return createPortal(
        <div className="modal-overlay" style={{ zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'none' }}>
            <div className="modal simple-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header-simple">
                    <div className="modal-title-simple">
                        <MessageSquare size={18} />
                        <span>Edit Comment: {user.name}</span>
                    </div>
                    <button className="close-btn-simple" onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body-simple">
                        <div className="input-group-simple">
                            <label>Note</label>
                            <textarea
                                className="input textarea-simple"
                                placeholder="..."
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                autoFocus
                            />
                        </div>
                        <div className="modal-tip-simple">
                            <Activity size={12} />
                            <span>Will update data on your MikroTik.</span>
                        </div>
                    </div>

                    <div className="modal-footer-simple">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            <Save size={16} />
                            <span>{loading ? 'Saving...' : 'Save'}</span>
                        </button>
                    </div>
                </form>

                <style>{`
                    .simple-modal {
                        background: var(--bg-secondary);
                        border: 1px solid var(--border-color);
                        border-radius: 4px;
                        width: 90%;
                        max-width: 400px;
                        box-shadow: 0 10px 25px rgba(0,0,0,0.2);
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

                    .modal-body-simple { padding: 16px; }

                    .input-group-simple label {
                        display: block;
                        font-size: 12px;
                        font-weight: 600;
                        color: var(--text-secondary);
                        margin-bottom: 6px;
                        text-transform: uppercase;
                    }

                    .textarea-simple {
                        width: 100%;
                        min-height: 100px;
                        resize: vertical;
                        line-height: 1.5;
                        font-size: 14px;
                    }

                    .modal-tip-simple {
                        margin-top: 12px;
                        display: flex;
                        gap: 8px;
                        align-items: center;
                        color: var(--text-muted);
                        font-size: 11px;
                    }

                    .modal-footer-simple {
                        padding: 12px 16px 16px;
                        display: flex;
                        justify-content: flex-end;
                        gap: 10px;
                        border-top: 1px solid var(--border-color);
                        background: rgba(0,0,0,0.02);
                    }
                    body.light-mode .modal-footer-simple { background: #f8fafc; }
                `}</style>
            </div>
        </div>,
        document.body
    );
}
