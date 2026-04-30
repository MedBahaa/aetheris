import { CompanyAnalysis, AgentType } from './agent-engine';

/**
 * CLIENT-SIDE HISTORY SERVICE
 * ✅ Gère la persistance locale (localStorage) de manière sécurisée.
 */
export const HistoryService = {
  
  saveToHistory(analysis: CompanyAnalysis) {
    if (typeof window === 'undefined') return;
    
    const history = this.getAllHistory();
    const updated = [
      analysis, 
      ...history.filter(a => !(a.companyName === analysis.companyName && a.type === analysis.type))
    ].slice(0, 30);
    
    localStorage.setItem('agent_history', JSON.stringify(updated));
  },

  getAllHistory(): CompanyAnalysis[] {
    if (typeof window === 'undefined') return [];
    const saved = localStorage.getItem('agent_history');
    return saved ? JSON.parse(saved) : [];
  },

  getFilteredHistory(type: AgentType): CompanyAnalysis[] {
    return this.getAllHistory().filter(a => a.type === type);
  }
};
