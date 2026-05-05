'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { Cloud, CheckCircle2, Lock, FolderSync, Smartphone } from 'lucide-react';

export default function OnboardingScreen() {
  const router = useRouter();
  const { user } = useUser();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);

  const handleConnectDrive = async () => {
    setIsConnecting(true);
    
    try {
      // Get OAuth URL
      const response = await fetch('/api/google-drive/connect?from=onboarding');
      const data = await response.json();
      
      if (data.authUrl) {
        // Mark onboarding as started
        localStorage.setItem('holly_onboarding_started', 'true');
        // Add onboarding parameter to OAuth state
        const authUrlWithOnboarding = data.authUrl + '&from=onboarding';
        // Redirect to Google OAuth
        window.location.href = authUrlWithOnboarding;
      } else {
        throw new Error('Failed to get authorization URL');
      }
    } catch (error) {
      console.error('Failed to connect Google Drive:', error);
      setIsConnecting(false);
      alert('Failed to connect. Please try again.');
    }
  };

  const handleSkip = () => {
    setIsSkipping(true);
    
    // Mark onboarding as completed (skipped)
    localStorage.setItem('holly_onboarding_completed', 'true');
    localStorage.setItem('holly_onboarding_skipped', 'true');
    
    // Go to chat
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-[#0B0A08] flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Welcome Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-[#D4A853] to-[#B84052] rounded-2xl mb-4 shadow-[0_0_30px_rgba(212,168,83,0.3)]">
            <span className="text-4xl font-black text-white">H</span>
          </div>
          <h1 className="text-4xl font-black text-[#F5F0E8] uppercase tracking-[0.2em] mb-2">
            HOLLY AWAITS
          </h1>
          <p className="text-lg text-[#8C8476] font-medium italic">
            Greetings, {user?.firstName || 'Seeker'}. Let us synchronize our domains.
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-[#12110F] rounded-2xl shadow-2xl border border-[#D4A853]/20 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#D4A853] to-[#B84052] p-6 shadow-lg">
            <div className="flex items-center gap-3 text-white">
              <Cloud className="w-8 h-8" />
              <div>
                <h2 className="text-2xl font-black uppercase tracking-widest">Connect Google Drive</h2>
                <p className="text-white/80 text-xs font-bold uppercase tracking-tighter">
                  Securely archive your synthesized intelligence
                </p>
              </div>
            </div>
          </div>

          {/* Benefits List */}
          <div className="p-8 space-y-5 bg-[#12110F]">
            {[
              { icon: CheckCircle2, title: "Sovereign Archival", desc: "Every artifact HOLLY synthesizes is automatically secured in your Drive.", iconColor: "text-[#D4A853]", bgColor: "bg-[#D4A853]/10" },
              { icon: Smartphone, title: "Universal Nexus", desc: "Access your intelligence assets from any device, anywhere in the world.", iconColor: "text-[#D4A853]", bgColor: "bg-[#D4A853]/10" },
              { icon: FolderSync, title: "Structured Cognition", desc: "HOLLY intelligently organizes files into dossiers by project and intent.", iconColor: "text-[#D4A853]", bgColor: "bg-[#D4A853]/10" },
              { icon: Lock, title: "Encryption & Privacy", desc: "Only HOLLY's workspace is accessible. Your other data remains private.", iconColor: "text-[#8C8476]", bgColor: "bg-white/5" },
            ].map((benefit, i) => (
              <div key={i} className="flex items-start gap-4 group">
                <div className={`flex-shrink-0 w-12 h-12 ${benefit.bgColor} rounded-xl flex items-center justify-center border border-white/5 transition-colors group-hover:border-[#D4A853]/30`}>
                  <benefit.icon className={`w-6 h-6 ${benefit.iconColor}`} />
                </div>
                <div>
                  <h3 className="font-bold text-[#F5F0E8] uppercase tracking-wider text-sm">{benefit.title}</h3>
                  <p className="text-xs text-[#8C8476] leading-relaxed mt-0.5">
                    {benefit.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="p-6 bg-white/[0.02] border-t border-white/5 flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleConnectDrive}
              disabled={isConnecting || isSkipping}
              className="flex-1 bg-gradient-to-r from-[#D4A853] to-[#B84052] text-white px-6 py-4 rounded-xl font-black uppercase tracking-[0.1em] text-xs hover:opacity-90 transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2.5"
            >
              {isConnecting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Synchronizing...
                </>
              ) : (
                <>
                  <Cloud className="w-4 h-4" />
                  Establish Nexus
                </>
              )}
            </button>
            
            <button
              onClick={handleSkip}
              disabled={isConnecting || isSkipping}
              className="px-6 py-4 text-[#8C8476] hover:text-[#F5F0E8] font-bold uppercase tracking-tighter text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSkipping ? 'Skipping...' : 'Skip for now'}
            </button>
          </div>
 
          {/* Footer Note */}
          <div className="px-6 pb-6 bg-white/[0.02]">
            <p className="text-[10px] text-[#5C564D] text-center uppercase tracking-widest font-medium">
              Synchronization can be initiated later via System Protocols
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
