'use client';

import { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, Share2, Copy, Check, Globe, Lock } from 'lucide-react';
import { cyberpunkTheme } from '@/styles/themes/cyberpunk';

interface ShareConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string;
  conversationTitle: string;
}

export function ShareConversationModal({ 
  isOpen, 
  onClose, 
  conversationId,
  conversationTitle 
}: ShareConversationModalProps) {
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [generating, setGenerating] = useState(false);

  const generateShareLink = async () => {
    try {
      setGenerating(true);
      const response = await fetch('/api/conversations/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId }),
      });

      if (response.ok) {
        const data = await response.json();
        setShareToken(data.shareToken);
      }
    } catch (error) {
      console.error('Failed to generate share link:', error);
    } finally {
      setGenerating(false);
    }
  };

  const shareLink = shareToken 
    ? `${window.location.origin}/shared/${shareToken}`
    : null;

  const handleCopy = async () => {
    if (shareLink) {
      try {
        await navigator.clipboard.writeText(shareLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        console.error('Failed to copy:', error);
      }
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel 
                className="w-full max-w-md transform overflow-hidden rounded-2xl p-6 text-left align-middle shadow-xl transition-all"
                style={{
                  backgroundColor: cyberpunkTheme.colors.background.secondary,
                  border: `1px solid ${cyberpunkTheme.colors.border.primary}`,
                }}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <Dialog.Title
                    className="text-2xl font-bold flex items-center gap-2"
                    style={{
                      background: cyberpunkTheme.colors.gradients.holographic,
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    <Share2 className="w-6 h-6" />
                    Share Conversation
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="p-2 rounded-lg hover:bg-white/5 transition-colors"
                    style={{ color: cyberpunkTheme.colors.text.secondary }}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Conversation Title */}
                <div 
                  className="p-3 rounded-lg mb-6"
                  style={{
                    backgroundColor: cyberpunkTheme.colors.background.primary,
                    border: `1px solid ${cyberpunkTheme.colors.border.primary}`,
                  }}
                >
                  <div 
                    className="text-sm mb-1"
                    style={{ color: cyberpunkTheme.colors.text.tertiary }}
                  >
                    Sharing:
                  </div>
                  <div style={{ color: cyberpunkTheme.colors.text.primary }}>
                    {conversationTitle || 'Untitled Conversation'}
                  </div>
                </div>

                {/* Visibility Toggle */}
                <div className="mb-6">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div>
                      <div 
                        className="font-medium mb-1"
                        style={{ color: cyberpunkTheme.colors.text.primary }}
                      >
                        {isPublic ? 'Public Link' : 'Private Link'}
                      </div>
                      <div 
                        className="text-sm"
                        style={{ color: cyberpunkTheme.colors.text.tertiary }}
                      >
                        {isPublic 
                          ? 'Anyone with the link can view'
                          : 'Only you can access this conversation'
                        }
                      </div>
                    </div>
                    <button
                      onClick={() => setIsPublic(!isPublic)}
                      className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                      style={{ color: isPublic ? cyberpunkTheme.colors.primary.cyan : cyberpunkTheme.colors.text.tertiary }}
                    >
                      {isPublic ? <Globe className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                    </button>
                  </label>
                </div>

                {/* Share Link */}
                {!shareToken ? (
                  <button
                    onClick={generateShareLink}
                    disabled={generating || !isPublic}
                    className="w-full py-3 rounded-lg transition-colors disabled:opacity-50"
                    style={{
                      background: isPublic 
                        ? cyberpunkTheme.colors.gradients.primary
                        : cyberpunkTheme.colors.background.primary,
                      color: isPublic ? '#FFFFFF' : cyberpunkTheme.colors.text.tertiary,
                    }}
                  >
                    {generating ? 'Generating...' : isPublic ? 'Generate Share Link' : 'Enable Public Access First'}
                  </button>
                ) : (
                  <div>
                    <div 
                      className="flex items-center gap-2 p-3 rounded-lg mb-4"
                      style={{
                        backgroundColor: cyberpunkTheme.colors.background.primary,
                        border: `1px solid ${cyberpunkTheme.colors.border.primary}`,
                      }}
                    >
                      <input
                        type="text"
                        value={shareLink || ''}
                        readOnly
                        className="flex-1 bg-transparent outline-none text-sm"
                        style={{ color: cyberpunkTheme.colors.text.primary }}
                      />
                      <button
                        onClick={handleCopy}
                        className="p-2 rounded hover:bg-white/10 transition-colors"
                        style={{ color: copied ? cyberpunkTheme.colors.primary.cyan : cyberpunkTheme.colors.text.secondary }}
                        title="Copy link"
                      >
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>

                    <div 
                      className="text-xs text-center"
                      style={{ color: cyberpunkTheme.colors.text.tertiary }}
                    >
                      This link will remain active until you revoke it
                    </div>
                  </div>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
