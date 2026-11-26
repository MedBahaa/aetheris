'use client';

import React from 'react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import DashboardContent from './DashboardContent';
import { DashboardProps } from '@/types/dashboard';

interface TabletDashboardProps extends DashboardProps {
  handleAgentChange: (type: any) => void;
}

export default function TabletDashboard(props: TabletDashboardProps) {
  return (
    <div className="app-container tablet-layout">
      <Header onOpenSidebar={() => props.setIsSidebarOpen(true)} />
      
      <main className="main-content tablet-content">
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <DashboardContent {...props} />
        </div>
      </main>
      
      {/* Off-canvas sidebar for tablet, same as mobile but maybe wider */}
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
