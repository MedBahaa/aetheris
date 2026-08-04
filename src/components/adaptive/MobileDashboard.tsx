'use client';

import React from 'react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import BottomNav from '@/components/BottomNav';
import DashboardContent from './DashboardContent';
import { DashboardProps } from '@/types/dashboard';

interface MobileDashboardProps extends DashboardProps {
  handleAgentChange: (type: any) => void;
}

export default function MobileDashboard(props: MobileDashboardProps) {
  return (
    <div className="app-container mobile-layout" style={{ display: 'block', paddingBottom: '70px' }}>
      <Header onOpenSidebar={() => props.setIsSidebarOpen(true)} />
      
      <main className="main-content mobile-content" style={{ padding: '1rem', paddingTop: 'calc(var(--header-height) + var(--sat) + 0.75rem)' }}>
        <DashboardContent {...props} />
      </main>
      
      <BottomNav />
      
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
