'use client';

import React from 'react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import DashboardContent from './DashboardContent';
import { DashboardProps } from '@/types/dashboard';

interface DesktopDashboardProps extends DashboardProps {
  handleAgentChange: (type: any) => void;
}

export default function DesktopDashboard(props: DesktopDashboardProps) {
  return (
    <div className="app-container desktop-layout" style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar 
        history={props.history} 
        onSelect={props.handleSelectFromHistory} 
        activeId={props.activeId}
        activeAgent={props.activeAgent}
        onAgentChange={props.handleAgentChange}
        isOpen={true} // Always open on desktop
        onClose={() => {}} 
      />
      
      <div className="desktop-main-wrapper" style={{ flex: 1, width: '100%', paddingLeft: 'var(--sidebar-width)' }}>
        <Header onOpenSidebar={() => {}} /> 
        
        <main className="main-content desktop-content" style={{ padding: '2.5rem', paddingTop: 'calc(var(--header-height) + 2.5rem)', margin: '0 auto', maxWidth: '1400px' }}>
          <DashboardContent {...props} />
        </main>
      </div>
    </div>
  );
}
