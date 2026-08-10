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
    <div className="app-container desktop-layout" style={{ display: 'block', minHeight: '100vh' }}>
      <Header onOpenSidebar={() => props.setIsSidebarOpen(!props.isSidebarOpen)} /> 
      
      <main className="main-content desktop-content" style={{ padding: '1.75rem 2rem', paddingTop: 'calc(var(--header-height) + 1.75rem)', margin: '0 auto', maxWidth: '1650px' }}>
        <DashboardContent {...props} />
      </main>

      <Sidebar 
        history={props.history} 
        onSelect={props.handleSelectFromHistory} 
        activeId={props.activeId}
        activeAgent={props.activeAgent}
        onAgentChange={props.handleAgentChange}
        isOpen={props.isSidebarOpen} 
        onClose={() => props.setIsSidebarOpen(false)} 
      />
    </div>
  );
}
