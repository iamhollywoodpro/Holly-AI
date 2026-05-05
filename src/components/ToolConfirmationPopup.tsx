'use client';

/**
 * TOOL CONFIRMATION POPUP
 * 
 * Beautiful confirmation dialog that appears before Holly executes sensitive actions
 * Inspired by ADA's confirmation system
 */

import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, CheckCircle, Info } from 'lucide-react';

export interface ToolConfirmationRequest {
  id: string;
  tool_name: string;
  action: string;
  reasoning: string;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  parameters?: Record<string, any>;
  estimated_duration?: string;
  reversible?: boolean;
}

interface ToolConfirmationPopupProps {
  request: ToolConfirmationRequest | null;
  onApprove: (requestId: string) => void;
  onDeny: (requestId: string) => void;
  onClose: () => void;
}

export function ToolConfirmationPopup({
  request,
  onApprove,
  onDeny,
  onClose
}: ToolConfirmationPopupProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (request) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [request]);

  if (!request || !isVisible) {
    return null;
  }

  const handleApprove = () => {
    onApprove(request.id);
    setIsVisible(false);
  };

  const handleDeny = () => {
    onDeny(request.id);
    setIsVisible(false);
  };

  const handleClose = () => {
    setIsVisible(false);
    onClose();
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low':
        return 'text-green-400 bg-green-500/10 border-green-500/30';
      case 'medium':
        return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
      case 'high':
        return 'text-orange-400 bg-orange-500/10 border-orange-500/30';
      case 'critical':
        return 'text-red-400 bg-red-500/10 border-red-500/30';
      default:
        return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
    }
  };

  const getRiskIcon = (risk: string) => {
    switch (risk) {
      case 'low':
        return <CheckCircle className="w-5 h-5" />;
      case 'medium':
      case 'high':
        return <AlertTriangle className="w-5 h-5" />;
      case 'critical':
        return <AlertTriangle className="w-5 h-5 animate-pulse" />;
      default:
        return <Info className="w-5 h-5" />;
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in duration-200"
        onClick={handleClose}
      />

      {/* Popup */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/50 rounded-2xl shadow-2xl max-w-lg w-full pointer-events-auto animate-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-zinc-700/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                <span className="text-2xl">🤖</span>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Holly needs your permission
                </h2>
                <p className="text-sm text-zinc-400">
                  Review the action before proceeding
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="text-zinc-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-zinc-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {/* Tool Name */}
            <div>
              <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">
                Tool
              </div>
              <div className="text-white font-medium">{request.tool_name}</div>
            </div>

            {/* Action */}
            <div>
              <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">
                Action
              </div>
              <div className="text-white">{request.action}</div>
            </div>

            {/* Reasoning */}
            <div>
              <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">
                Why Holly wants to do this
              </div>
              <div className="text-zinc-300 text-sm leading-relaxed">
                {request.reasoning}
              </div>
            </div>

            {/* Risk Level */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">
                  Risk Level
                </div>
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${getRiskColor(request.risk_level)}`}>
                  {getRiskIcon(request.risk_level)}
                  <span className="text-sm font-medium capitalize">
                    {request.risk_level}
                  </span>
                </div>
              </div>

              {request.reversible !== undefined && (
                <div>
                  <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">
                    Reversible
                  </div>
                  <div className={`text-sm ${request.reversible ? 'text-green-400' : 'text-red-400'}`}>
                    {request.reversible ? 'Yes' : 'No'}
                  </div>
                </div>
              )}

              {request.estimated_duration && (
                <div>
                  <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">
                    Duration
                  </div>
                  <div className="text-sm text-zinc-300">
                    {request.estimated_duration}
                  </div>
                </div>
              )}
            </div>

            {/* Parameters (if any) */}
            {request.parameters && Object.keys(request.parameters).length > 0 && (
              <div>
                <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2">
                  Parameters
                </div>
                <div className="bg-zinc-800/50 rounded-lg p-3 space-y-1">
                  {Object.entries(request.parameters).map(([key, value]) => (
                    <div key={key} className="flex justify-between text-sm">
                      <span className="text-zinc-400">{key}:</span>
                      <span className="text-zinc-200 font-mono">
                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 p-6 border-t border-zinc-700/50">
            <button
              onClick={handleDeny}
              className="flex-1 px-4 py-2.5 rounded-lg border border-zinc-600 text-zinc-300 hover:bg-zinc-800 hover:text-white transition-all duration-200 font-medium"
            >
              Deny
            </button>
            <button
              onClick={handleApprove}
              className="flex-1 px-4 py-2.5 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 transition-all duration-200 font-medium shadow-lg shadow-purple-500/25"
            >
              Approve
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * Hook to manage tool confirmations
 */
export function useToolConfirmation() {
  const [currentRequest, setCurrentRequest] = useState<ToolConfirmationRequest | null>(null);
  const [pendingRequests, setPendingRequests] = useState<ToolConfirmationRequest[]>([]);
  const [approvedRequests, setApprovedRequests] = useState<Set<string>>(new Set());
  const [deniedRequests, setDeniedRequests] = useState<Set<string>>(new Set());

  const requestConfirmation = (request: Omit<ToolConfirmationRequest, 'id'>): Promise<boolean> => {
    return new Promise((resolve) => {
      const id = `${Date.now()}-${Math.random()}`;
      const fullRequest: ToolConfirmationRequest = { ...request, id };

      setPendingRequests((prev) => [...prev, fullRequest]);

      // Show the request
      setCurrentRequest(fullRequest);

      // Wait for approval or denial
      const checkInterval = setInterval(() => {
        if (approvedRequests.has(id)) {
          clearInterval(checkInterval);
          resolve(true);
        } else if (deniedRequests.has(id)) {
          clearInterval(checkInterval);
          resolve(false);
        }
      }, 100);
    });
  };

  const handleApprove = (requestId: string) => {
    setApprovedRequests((prev) => new Set(prev).add(requestId));
    setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
    setCurrentRequest(null);
  };

  const handleDeny = (requestId: string) => {
    setDeniedRequests((prev) => new Set(prev).add(requestId));
    setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
    setCurrentRequest(null);
  };

  const handleClose = () => {
    if (currentRequest) {
      handleDeny(currentRequest.id);
    }
  };

  return {
    currentRequest,
    requestConfirmation,
    handleApprove,
    handleDeny,
    handleClose,
    pendingCount: pendingRequests.length
  };
}
