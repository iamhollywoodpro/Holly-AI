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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Welcome Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl mb-4 shadow-lg">
            <span className="text-4xl font-bold text-white">H</span>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Welcome to HOLLY! 🎉
          </h1>
          <p className="text-lg text-gray-600">
            Hi {user?.firstName || 'there'}! Let's get you set up in just a minute.
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6">
            <div className="flex items-center gap-3 text-white">
              <Cloud className="w-8 h-8" />
              <div>
                <h2 className="text-2xl font-bold">Connect Google Drive</h2>
                <p className="text-blue-100 text-sm">
                  Save your generated files automatically
                </p>
              </div>
            </div>
          </div>

          {/* Benefits List */}
          <div className="p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Automatic Saving</h3>
                <p className="text-sm text-gray-600">
                  Every file HOLLY creates is automatically saved to your Drive
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Smartphone className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Access Anywhere</h3>
                <p className="text-sm text-gray-600">
                  Access your files from any device with Google Drive
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <FolderSync className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Organized Folders</h3>
                <p className="text-sm text-gray-600">
                  HOLLY automatically organizes files in folders by project
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <Lock className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Secure & Private</h3>
                <p className="text-sm text-gray-600">
                  Only HOLLY's files. We never access your other Drive files.
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="p-6 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleConnectDrive}
              disabled={isConnecting || isSkipping}
              className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isConnecting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Cloud className="w-5 h-5" />
                  Connect Google Drive
                </>
              )}
            </button>
            
            <button
              onClick={handleSkip}
              disabled={isConnecting || isSkipping}
              className="px-6 py-3 text-gray-600 hover:text-gray-900 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSkipping ? 'Skipping...' : 'Skip for now'}
            </button>
          </div>

          {/* Footer Note */}
          <div className="px-6 pb-6">
            <p className="text-xs text-gray-500 text-center">
              You can always connect later from Settings → Integrations
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
