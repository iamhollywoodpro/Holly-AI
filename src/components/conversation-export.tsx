// HOLLY Phase 2D: Export Conversations Component - FIXED
// Export to PDF and Markdown with formatting
// Fixed z-index and positioning issues

'use client';

import { useState } from 'react';
import { Download, FileText, File } from 'lucide-react';
import jsPDF from 'jspdf';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface ConversationExportProps {
  conversation: Conversation;
  messages: Message[];
}

export function ConversationExport({ conversation, messages }: ConversationExportProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const exportToMarkdown = () => {
    setIsExporting(true);
    try {
      let markdown = `# ${conversation.title}\n\n`;
      markdown += `**Created:** ${formatDate(conversation.created_at)}\n`;
      markdown += `**Last Updated:** ${formatDate(conversation.updated_at)}\n`;
      markdown += `**Total Messages:** ${messages.length}\n\n`;
      markdown += `---\n\n`;

      messages.forEach((msg, index) => {
        const role = msg.role === 'user' ? '👤 You' : '🤖 HOLLY';
        const time = formatDate(msg.created_at);
        markdown += `## ${role} - ${time}\n\n`;
        markdown += `${msg.content}\n\n`;
        if (index < messages.length - 1) {
          markdown += `---\n\n`;
        }
      });

      // Create download
      const blob = new Blob([markdown], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${conversation.title.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setShowMenu(false);
    } catch (error) {
      console.error('Export to Markdown failed:', error);
      alert('Failed to export to Markdown. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const exportToPDF = () => {
    setIsExporting(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      const maxWidth = pageWidth - margin * 2;
      let yPosition = margin;

      // Helper to add new page if needed
      const checkPageBreak = (requiredSpace: number) => {
        if (yPosition + requiredSpace > pageHeight - margin) {
          doc.addPage();
          yPosition = margin;
          return true;
        }
        return false;
      };

      // Title
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text(conversation.title, margin, yPosition);
      yPosition += 10;

      // Metadata
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);
      doc.text(`Created: ${formatDate(conversation.created_at)}`, margin, yPosition);
      yPosition += 5;
      doc.text(`Updated: ${formatDate(conversation.updated_at)}`, margin, yPosition);
      yPosition += 5;
      doc.text(`Messages: ${messages.length}`, margin, yPosition);
      yPosition += 15;

      // Messages
      messages.forEach((msg, index) => {
        checkPageBreak(30);

        // Role and timestamp
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0);
        const role = msg.role === 'user' ? 'YOU' : 'HOLLY';
        const roleColor: [number, number, number] = msg.role === 'user' ? [59, 130, 246] : [139, 92, 246]; // blue : purple
        doc.setTextColor(...roleColor);
        doc.text(role, margin, yPosition);
        
        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.text(formatDate(msg.created_at), margin + 25, yPosition);
        yPosition += 7;

        // Message content
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0);
        const lines = doc.splitTextToSize(msg.content, maxWidth);
        
        lines.forEach((line: string) => {
          checkPageBreak(7);
          doc.text(line, margin, yPosition);
          yPosition += 5;
        });

        yPosition += 5;

        // Separator
        if (index < messages.length - 1) {
          checkPageBreak(5);
          doc.setDrawColor(200);
          doc.line(margin, yPosition, pageWidth - margin, yPosition);
          yPosition += 10;
        }
      });

      // Save
      doc.save(`${conversation.title.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.pdf`);
      setShowMenu(false);
    } catch (error) {
      console.error('Export to PDF failed:', error);
      alert('Failed to export to PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        disabled={isExporting}
        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
        aria-label="Export conversation"
      >
        <Download className="w-4 h-4" />
        Export
      </button>

      {/* FIXED: Added higher z-index and better visibility */}
      {showMenu && (
        <>
          {/* Backdrop to close menu when clicking outside */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowMenu(false)}
          />
          
          {/* Export menu with proper z-index */}
          <div className="absolute top-full right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-2 z-50 min-w-[200px]">
            <button
              onClick={exportToMarkdown}
              disabled={isExporting}
              className="flex items-center gap-3 w-full px-3 py-2 text-sm text-gray-900 dark:text-gray-100 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              <FileText className="w-4 h-4" />
              <span>Export as Markdown</span>
            </button>
            <button
              onClick={exportToPDF}
              disabled={isExporting}
              className="flex items-center gap-3 w-full px-3 py-2 text-sm text-gray-900 dark:text-gray-100 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              <File className="w-4 h-4" />
              <span>Export as PDF</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
