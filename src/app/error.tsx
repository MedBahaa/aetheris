'use client'; // Error boundaries must be Client Components

import { useEffect } from 'react';
import { logger } from '@/lib/logger';
import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    logger.error('Global Application Error:', { error: error.message, stack: error.stack, digest: error.digest });
  }, [error]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '2rem',
      textAlign: 'center',
      background: 'var(--bg-dark)',
      color: 'var(--text-main)',
    }}>
      <div className="glass" style={{
        padding: '3rem',
        borderRadius: '16px',
        maxWidth: '500px',
        border: '1px solid var(--accent-emerald)'
      }}>
        <h2 style={{ fontSize: '2rem', marginBottom: '1rem', color: 'var(--accent-emerald)' }}>Oups, une erreur est survenue</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
          Nous avons rencontré un problème inattendu. Notre équipe technique a été notifiée.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button
            onClick={() => reset()}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'var(--accent-emerald)',
              color: '#000',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Réessayer
          </button>
          <Link href="/" style={{
            padding: '0.75rem 1.5rem',
            background: 'transparent',
            border: '1px solid var(--border-glass)',
            color: 'var(--text-main)',
            borderRadius: '8px',
            textDecoration: 'none',
            display: 'inline-block'
          }}>
            Retour à l'accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
