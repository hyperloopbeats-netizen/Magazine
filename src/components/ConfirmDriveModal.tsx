import React from 'react';
import { CloudUpload, X } from 'lucide-react';

interface ConfirmDriveModalProps {
  open: boolean;
  fileName: string;
  actionType: 'create' | 'update';
  eventCount: number;
  summary: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDriveModal: React.FC<ConfirmDriveModalProps> = ({
  open,
  fileName,
  actionType,
  eventCount,
  summary,
  onConfirm,
  onCancel,
}) => {
  if (!open) return null;

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="drive-confirm-title"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="modal-card os-panel">
        <div className="os-window-header" style={{ cursor: 'default' }}>
          <div className="os-window-title-wrap">
            <CloudUpload size={14} color="#38bdf8" />
            <span id="drive-confirm-title" className="os-window-title">
              Confirm Google Drive {actionType === 'update' ? 'Update' : 'Creation'}
            </span>
          </div>
          <button
            type="button"
            className="os-win-ctrl-btn"
            onClick={onCancel}
            aria-label="Cancel Drive sync"
          >
            <X size={13} />
          </button>
        </div>

        <div className="os-window-body" style={{ gap: 10 }}>
          <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, color: '#e2e8f0' }}>
            {actionType === 'update'
              ? `Overwrite existing Google Drive file "${fileName}" with ${eventCount} Gemini-encoded library events?`
              : `Create new Google Drive library file "${fileName}" containing ${eventCount} Gemini-encoded events?`}
          </p>

          <div
            style={{
              padding: '8px 10px',
              borderRadius: 6,
              background: 'rgba(0, 0, 0, 0.35)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              fontSize: 11.5,
              color: '#94a3b8',
              lineHeight: 1.45,
            }}
          >
            {summary || 'Structured event library matrix processed for cloud archival and data analysis.'}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
            <button type="button" className="os-btn os-icon-btn" onClick={onCancel}>
              Cancel
            </button>
            <button
              type="button"
              className="os-btn os-icon-btn os-icon-btn--primary"
              onClick={onConfirm}
            >
              Confirm Save to Drive
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
