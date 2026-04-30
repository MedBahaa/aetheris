import React from 'react';

export const SkeletonLoader = ({ type }: { type: 'card' | 'text' | 'report' }) => {
  if (type === 'report') {
    return (
      <div className="skeleton-container report">
        <div className="skeleton-header"></div>
        <div className="skeleton-grid">
          <div className="skeleton-item card"></div>
          <div className="skeleton-item card"></div>
          <div className="skeleton-item card"></div>
          <div className="skeleton-item card"></div>
        </div>
        <div className="skeleton-line long"></div>
        <div className="skeleton-line mid"></div>
        <div className="skeleton-line short"></div>
        
        <style jsx>{`
          .skeleton-container { width: 100%; animation: pulse 1.5s infinite var(--ease); }
          .skeleton-header { height: 60px; background: rgba(255,255,255,0.03); border-radius: 1rem; margin-bottom: 2rem; }
          .skeleton-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem; margin-bottom: 2rem; }
          .skeleton-item.card { height: 120px; background: rgba(255,255,255,0.02); border-radius: 0.75rem; }
          .skeleton-line { height: 12px; background: rgba(255,255,255,0.02); border-radius: 4px; margin-bottom: 1rem; }
          .skeleton-line.long { width: 100%; }
          .skeleton-line.mid { width: 70%; }
          .skeleton-line.short { width: 40%; }
          
          @keyframes pulse {
            0% { opacity: 0.6; }
            50% { opacity: 0.3; }
            100% { opacity: 0.6; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="skeleton-text">
       <style jsx>{`
         .skeleton-text { height: 20px; background: rgba(255,255,255,0.02); border-radius: 4px; width: 100%; animation: pulse 1.5s infinite; }
         @keyframes pulse { 0%, 100% { opacity: 0.5; } 50% { opacity: 0.2; } }
       `}</style>
    </div>
  );
};
