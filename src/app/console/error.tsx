'use client'; // Error components must be Client Components

import { useEffect } from 'react';
import { AlertCircle, RefreshCcw } from 'lucide-react';

export default function ConsoleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Console Page Error:', error);
  }, [error]);

  const isChunkError = error.name === 'ChunkLoadError' || error.message.includes('Loading chunk') || error.message.includes('fetch');

  return (
    <div className="dashboard-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-main)' }}>
      <div className="console-empty-state animate-fade-in glass-heavy" style={{ padding: '4rem 2rem', textAlign: 'center', borderRadius: '12px', maxWidth: '500px' }}>
        <AlertCircle size={40} className="text-emerald" style={{ margin: '0 auto 1rem', opacity: 0.8, color: 'var(--alert-amber, #f59e0b)' }} />
        <h3 className="mono text-lg mb-2" style={{ color: '#fff' }}>
          {isChunkError ? 'Mise à jour en cours' : 'Erreur de connexion'}
        </h3>
        <p className="text-muted text-sm mb-6" style={{ maxWidth: '400px', margin: '0 auto 1.5rem', lineHeight: '1.6' }}>
          {isChunkError 
            ? "Une nouvelle version d'Aetheris vient d'être déployée. Veuillez rafraîchir l'application pour synchroniser les modules." 
            : "L'orchestrateur a rencontré une anomalie lors du chargement de l'interface. Vos données sont sécurisées."}
        </p>
        <button 
          onClick={() => isChunkError ? window.location.reload() : reset()}
          className="global-refresh-btn glass"
          style={{ padding: '0.75rem 1.5rem', borderRadius: '8px', margin: '0 auto', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
        >
          <RefreshCcw size={16} className="text-emerald" />
          <span className="mono text-sm" style={{ color: '#f8fafc', fontWeight: '600' }}>ACTUALISER L'APPLICATION</span>
        </button>
      </div>
    </div>
  );
}
