/**
 * TOOL CONFIRMATION MANAGER
 * 
 * Manages tool confirmation requests and responses
 * Integrates with Holly's AI to request permission before sensitive actions
 */

export interface ToolAction {
  tool_name: string;
  action: string;
  reasoning: string;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  parameters?: Record<string, any>;
  estimated_duration?: string;
  reversible?: boolean;
}

export interface ConfirmationResponse {
  approved: boolean;
  request_id: string;
  timestamp: Date;
}

class ToolConfirmationManager {
  private pendingConfirmations: Map<string, (approved: boolean) => void> = new Map();
  private confirmationHistory: ConfirmationResponse[] = [];

  /**
   * Request confirmation for a tool action
   * Returns a promise that resolves when user approves/denies
   */
  async requestConfirmation(action: ToolAction): Promise<boolean> {
    const requestId = `${Date.now()}-${Math.random()}`;

    return new Promise((resolve) => {
      // Store the resolver
      this.pendingConfirmations.set(requestId, resolve);

      // Emit event for UI to show confirmation popup
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('tool-confirmation-request', {
            detail: {
              id: requestId,
              ...action
            }
          })
        );
      }

      // Timeout after 5 minutes
      setTimeout(() => {
        if (this.pendingConfirmations.has(requestId)) {
          console.warn('[ToolConfirmation] Request timed out:', requestId);
          this.respondToConfirmation(requestId, false);
        }
      }, 5 * 60 * 1000);
    });
  }

  /**
   * Respond to a confirmation request
   */
  respondToConfirmation(requestId: string, approved: boolean): void {
    const resolver = this.pendingConfirmations.get(requestId);
    if (resolver) {
      resolver(approved);
      this.pendingConfirmations.delete(requestId);

      // Record in history
      this.confirmationHistory.push({
        approved,
        request_id: requestId,
        timestamp: new Date()
      });

      // Keep only last 100 confirmations
      if (this.confirmationHistory.length > 100) {
        this.confirmationHistory.shift();
      }
    }
  }

  /**
   * Get confirmation history
   */
  getHistory(): ConfirmationResponse[] {
    return [...this.confirmationHistory];
  }

  /**
   * Get pending confirmations count
   */
  getPendingCount(): number {
    return this.pendingConfirmations.size;
  }

  /**
   * Clear all pending confirmations
   */
  clearPending(): void {
    // Deny all pending
    for (const [requestId] of this.pendingConfirmations) {
      this.respondToConfirmation(requestId, false);
    }
  }
}

// Singleton instance
export const toolConfirmationManager = new ToolConfirmationManager();

/**
 * Helper function to check if a tool requires confirmation
 */
export function requiresConfirmation(toolName: string, parameters?: Record<string, any>): boolean {
  // Define which tools require confirmation
  const sensitiveTools = [
    'file_delete',
    'file_write',
    'code_execute',
    'api_call',
    'database_modify',
    'system_command',
    'web_scrape',
    'email_send',
    'payment_process'
  ];

  // Check if tool is sensitive
  if (sensitiveTools.includes(toolName.toLowerCase())) {
    return true;
  }

  // Check if parameters indicate sensitive operation
  if (parameters) {
    if (parameters.destructive || parameters.irreversible) {
      return true;
    }
    if (parameters.cost && parseFloat(parameters.cost) > 0) {
      return true;
    }
  }

  return false;
}

/**
 * Determine risk level for a tool action
 */
export function determineRiskLevel(
  toolName: string,
  parameters?: Record<string, any>
): 'low' | 'medium' | 'high' | 'critical' {
  const criticalTools = ['database_delete', 'system_shutdown', 'payment_process'];
  const highRiskTools = ['file_delete', 'code_execute', 'api_call'];
  const mediumRiskTools = ['file_write', 'web_scrape', 'email_send'];

  if (criticalTools.includes(toolName.toLowerCase())) {
    return 'critical';
  }

  if (highRiskTools.includes(toolName.toLowerCase())) {
    return 'high';
  }

  if (mediumRiskTools.includes(toolName.toLowerCase())) {
    return 'medium';
  }

  // Check parameters
  if (parameters) {
    if (parameters.destructive || parameters.irreversible) {
      return 'high';
    }
    if (parameters.cost && parseFloat(parameters.cost) > 10) {
      return 'critical';
    }
    if (parameters.cost && parseFloat(parameters.cost) > 0) {
      return 'medium';
    }
  }

  return 'low';
}
