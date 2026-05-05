'use client';

import { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, Download, FileText, FileJson, Code } from 'lucide-react';
import { cyberpunkTheme } from '@/styles/themes/cyberpunk';
import { exportConversation, type ExportFormat } from '@/lib/conversation-export';
import type { Message } from '@/types/conversation';

interface ExportConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  messages: Message[];
  title?: string;
}

const exportFormats = [
  {
    format: 'markdown' as ExportFormat,
    icon: FileText,
    name: 'Markdown',
    description: 'Best for documentation and GitHub',
    extension: '.md',
  },
  {
    format: 'txt' as ExportFormat,
    icon: FileText,
    name: 'Plain Text',
    description: 'Simple text format',
    extension: '.txt',
  },
  {
    format: 'json' as ExportFormat,
    icon: FileJson,
    name: 'JSON',
    description: 'Structured data format',
    extension: '.json',
  },
  {
    format: 'html' as ExportFormat,
    icon: Code,
    name: 'HTML',
    description: 'Styled webpage',
    extension: '.html',
  },
];

export function ExportConversationModal({ 
  isOpen, 
  onClose, 
  messages,
  title = 'HOLLY Conversation'
}: ExportConversationModalProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('markdown');
  const [includeTimestamps, setIncludeTimestamps] = useState(true);
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    try {
      setExporting(true);
      await exportConversation(messages, selectedFormat, {
        title,
        includeTimestamps,
        includeMetadata,
      });
      onClose();
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setExporting(false);
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
                className="w-full max-w-lg transform overflow-hidden rounded-2xl p-6 text-left align-middle shadow-xl transition-all"
                style={{
                  backgroundColor: cyberpunkTheme.colors.background.secondary,
                  border: `1px solid ${cyberpunkTheme.colors.border.primary}`,
                }}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <Dialog.Title
                    className="text-2xl font-bold"
                    style={{
                      background: cyberpunkTheme.colors.gradients.holographic,
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    📤 Export Conversation
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="p-2 rounded-lg hover:bg-white/5 transition-colors"
                    style={{ color: cyberpunkTheme.colors.text.secondary }}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Format Selection */}
                <div className="space-y-3 mb-6">
                  <label 
                    className="block text-sm font-medium mb-2"
                    style={{ color: cyberpunkTheme.colors.text.primary }}
                  >
                    Select Format
                  </label>
                  {exportFormats.map((fmt) => {
                    const Icon = fmt.icon;
                    const isSelected = selectedFormat === fmt.format;
                    return (
                      <button
                        key={fmt.format}
                        onClick={() => setSelectedFormat(fmt.format)}
                        className="w-full p-4 rounded-lg text-left transition-all"
                        style={{
                          backgroundColor: isSelected 
                            ? cyberpunkTheme.colors.background.primary
                            : 'transparent',
                          border: `1px solid ${isSelected 
                            ? cyberpunkTheme.colors.primary.cyan 
                            : cyberpunkTheme.colors.border.primary}`,
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <Icon 
                            className="w-5 h-5 flex-shrink-0 mt-0.5"
                            style={{ color: isSelected 
                              ? cyberpunkTheme.colors.primary.cyan 
                              : cyberpunkTheme.colors.text.secondary 
                            }}
                          />
                          <div className="flex-1">
                            <div 
                              className="font-medium mb-1"
                              style={{ color: cyberpunkTheme.colors.text.primary }}
                            >
                              {fmt.name} <span style={{ color: cyberpunkTheme.colors.text.tertiary }}>({fmt.extension})</span>
                            </div>
                            <div 
                              className="text-sm"
                              style={{ color: cyberpunkTheme.colors.text.tertiary }}
                            >
                              {fmt.description}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Options */}
                <div className="space-y-3 mb-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeTimestamps}
                      onChange={(e) => setIncludeTimestamps(e.target.checked)}
                      className="rounded"
                      style={{ accentColor: cyberpunkTheme.colors.primary.cyan }}
                    />
                    <span 
                      className="text-sm"
                      style={{ color: cyberpunkTheme.colors.text.primary }}
                    >
                      Include timestamps
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeMetadata}
                      onChange={(e) => setIncludeMetadata(e.target.checked)}
                      className="rounded"
                      style={{ accentColor: cyberpunkTheme.colors.primary.cyan }}
                    />
                    <span 
                      className="text-sm"
                      style={{ color: cyberpunkTheme.colors.text.primary }}
                    >
                      Include metadata
                    </span>
                  </label>
                </div>

                {/* Info */}
                <div 
                  className="p-3 rounded-lg mb-6 text-sm"
                  style={{
                    backgroundColor: cyberpunkTheme.colors.background.primary,
                    border: `1px solid ${cyberpunkTheme.colors.border.primary}`,
                    color: cyberpunkTheme.colors.text.secondary,
                  }}
                >
                  📊 {messages.length} messages will be exported
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 rounded-lg hover:bg-white/5 transition-colors"
                    style={{ color: cyberpunkTheme.colors.text.secondary }}
                    disabled={exporting}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleExport}
                    disabled={exporting}
                    className="px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                    style={{
                      background: exporting 
                        ? cyberpunkTheme.colors.background.primary
                        : cyberpunkTheme.colors.gradients.primary,
                      color: '#FFFFFF',
                      opacity: exporting ? 0.5 : 1,
                    }}
                  >
                    <Download className="w-4 h-4" />
                    {exporting ? 'Exporting...' : 'Export'}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
