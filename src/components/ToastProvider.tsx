'use client';

import React, { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastPayload {
  type: ToastType;
  message: string;
  durationMs?: number;
}

interface ToastItem extends ToastPayload {
  id: string;
}

interface ToastContextValue {
  showToast: (payload: ToastPayload) => void;
  success: (message: string, durationMs?: number) => void;
  error: (message: string, durationMs?: number) => void;
  info: (message: string, durationMs?: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    ({ type, message, durationMs = 4200 }: ToastPayload) => {
      if (!message) return;
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev.slice(-2), { id, type, message, durationMs }]);
      if (durationMs > 0) {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, durationMs);
      }
    },
    []
  );

  const success = useCallback(
    (message: string, durationMs?: number) => showToast({ type: 'success', message, durationMs }),
    [showToast]
  );

  const error = useCallback(
    (message: string, durationMs?: number) => showToast({ type: 'error', message, durationMs }),
    [showToast]
  );

  const info = useCallback(
    (message: string, durationMs?: number) => showToast({ type: 'info', message, durationMs }),
    [showToast]
  );

  return (
    <ToastContext.Provider value={{ showToast, success, error, info }}>
      {children}

      {toasts.length > 0 && (
        <div className="toast-viewport no-print" role="region" aria-live="polite" aria-label="Notifications système">
          {toasts.map((toast) => (
            <div key={toast.id} className={`toast-card ${toast.type}`} role="status">
              <div className="toast-icon">
                {toast.type === 'success' && <CheckCircle2 size={17} />}
                {toast.type === 'error' && <AlertTriangle size={17} />}
                {toast.type === 'info' && <Info size={17} />}
              </div>
              <span className="toast-message">{toast.message}</span>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="toast-close"
                aria-label="Fermer la notification"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        .toast-viewport {
          position: fixed;
          right: 1.25rem;
          bottom: 1.25rem;
          z-index: var(--z-toast, 4000);
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
          width: min(390px, calc(100vw - 2rem));
          pointer-events: none;
        }

        .toast-card {
          pointer-events: auto;
          display: flex;
          align-items: center;
          gap: 0.65rem;
          padding: 0.85rem 1rem;
          border-radius: 12px;
          background: rgba(11, 16, 27, 0.96);
          border: 1px solid rgba(255, 255, 255, 0.12);
          box-shadow: 0 16px 36px rgba(0, 0, 0, 0.55);
          backdrop-filter: blur(14px);
          color: #f8fafc;
          font-size: 0.84rem;
          font-weight: 600;
          line-height: 1.38;
          animation: toastIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .toast-card.success {
          border-color: rgba(16, 185, 129, 0.38);
          background: linear-gradient(135deg, rgba(6, 78, 59, 0.94), rgba(11, 16, 27, 0.96));
        }

        .toast-card.error {
          border-color: rgba(244, 63, 94, 0.42);
          background: linear-gradient(135deg, rgba(136, 19, 55, 0.92), rgba(11, 16, 27, 0.96));
        }

        .toast-card.info {
          border-color: rgba(56, 189, 248, 0.38);
          background: linear-gradient(135deg, rgba(12, 74, 110, 0.92), rgba(11, 16, 27, 0.96));
        }

        .toast-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .toast-card.success .toast-icon {
          color: #34d399;
        }

        .toast-card.error .toast-icon {
          color: #fda4af;
        }

        .toast-card.info .toast-icon {
          color: #7dd3fc;
        }

        .toast-message {
          flex: 1;
          min-width: 0;
        }

        .toast-close {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border-radius: 8px;
          border: none;
          background: rgba(255, 255, 255, 0.08);
          color: #cbd5e1;
          cursor: pointer;
          flex-shrink: 0;
          transition: background 0.15s ease, color 0.15s ease;
        }

        .toast-close:hover {
          background: rgba(255, 255, 255, 0.16);
          color: #ffffff;
        }

        @keyframes toastIn {
          from {
            opacity: 0;
            transform: translateY(10px) scale(0.97);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @media (max-width: 768px) {
          .toast-viewport {
            right: auto;
            left: 50%;
            bottom: auto;
            top: calc(var(--header-height, 60px) + 0.75rem);
            transform: translateX(-50%);
            width: calc(100vw - 1.5rem);
          }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      showToast: () => {},
      success: () => {},
      error: () => {},
      info: () => {},
    };
  }
  return ctx;
}
