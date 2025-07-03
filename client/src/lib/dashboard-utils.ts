/**
 * Dashboard calculation utilities
 */

export const dashboardCalculations = {
  /**
   * Calculate sessions scheduled for tomorrow
   */
  getTomorrowSessionsCount(sessionsData: any[]): number {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDateString = tomorrow.toISOString().split('T')[0];
    
    return sessionsData.filter((session: any) => {
      return session.date === tomorrowDateString && session.status === 'scheduled';
    }).length;
  },

  /**
   * Calculate cases that need follow-up (pending or stale active cases)
   */
  getCasesNeedingFollowUp(casesData: any[]): number {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    return casesData.filter((caseItem: any) => {
      // Cases that are pending or have been active for a long time without update
      return caseItem.status === 'pending' || 
             (caseItem.status === 'active' && 
              new Date(caseItem.updatedAt || caseItem.createdAt) < sevenDaysAgo);
    }).length;
  },

  /**
   * Calculate clients added in the last 30 days
   */
  getRecentClientsCount(clientsData: any[]): number {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    return clientsData.filter((client: any) => {
      return new Date(client.createdAt) > thirtyDaysAgo;
    }).length;
  },

  /**
   * Calculate total amount of unpaid invoices
   */
  getTotalPendingAmount(invoicesData: any[]): number {
    return invoicesData
      .filter((invoice: any) => !invoice.paid)
      .reduce((total: number, invoice: any) => total + (invoice.amount || 0), 0);
  }
}; 