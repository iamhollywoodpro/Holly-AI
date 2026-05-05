/**
 * ModularWindow - Draggable, resizable window component
 * Provides window chrome with title bar, controls, and content area
 */

'use client';

import { useState, useRef, useEffect, ReactNode } from 'react';
import { X, Minimize2, Maximize2, Minus } from 'lucide-react';
import { WindowState } from '@/lib/window-manager';

export interface ModularWindowProps {
  window: WindowState;
  isActive: boolean;
  onFocus: () => void;
  onClose: () => void;
  onMinimize: () => void;
  onMaximize: () => void;
  onRestore: () => void;
  onPositionChange: (x: number, y: number) => void;
  onSizeChange: (width: number, height: number) => void;
  children: ReactNode;
}

export default function ModularWindow({
  window,
  isActive,
  onFocus,
  onClose,
  onMinimize,
  onMaximize,
  onRestore,
  onPositionChange,
  onSizeChange,
  children,
}: ModularWindowProps) {
  const windowRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });

  // Handle window dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    if (window.isMaximized) return;
    
    onFocus();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - window.position.x,
      y: e.clientY - window.position.y,
    });
  };

  // Handle window resizing
  const handleResizeMouseDown = (e: React.MouseEvent) => {
    if (window.isMaximized) return;
    
    e.stopPropagation();
    onFocus();
    setIsResizing(true);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: window.size.width,
      height: window.size.height,
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const newX = e.clientX - dragStart.x;
        const newY = e.clientY - dragStart.y;
        
        // Keep window within viewport
        const maxX = (typeof globalThis.window !== 'undefined' ? globalThis.window.innerWidth : 1920) - 100;
        const maxY = (typeof globalThis.window !== 'undefined' ? globalThis.window.innerHeight : 1080) - 100;
        
        onPositionChange(
          Math.max(0, Math.min(newX, maxX)),
          Math.max(0, Math.min(newY, maxY))
        );
      } else if (isResizing) {
        const deltaX = e.clientX - resizeStart.x;
        const deltaY = e.clientY - resizeStart.y;
        
        const newWidth = Math.max(300, resizeStart.width + deltaX);
        const newHeight = Math.max(200, resizeStart.height + deltaY);
        
        onSizeChange(newWidth, newHeight);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, dragStart, resizeStart, onPositionChange, onSizeChange]);

  if (window.isMinimized) {
    return null;
  }

  const style: React.CSSProperties = window.isMaximized
    ? {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%',
        zIndex: window.zIndex,
      }
    : {
        position: 'fixed',
        left: window.position.x,
        top: window.position.y,
        width: window.size.width,
        height: window.size.height,
        zIndex: window.zIndex,
      };

  return (
    <div
      ref={windowRef}
      className={`
        flex flex-col
        bg-white dark:bg-gray-900
        border border-gray-300 dark:border-gray-700
        rounded-lg shadow-2xl
        overflow-hidden
        ${isActive ? 'ring-2 ring-purple-500' : ''}
        ${isDragging || isResizing ? 'select-none' : ''}
      `}
      style={style}
      onMouseDown={onFocus}
    >
      {/* Title Bar */}
      <div
        className={`
          flex items-center justify-between
          px-4 py-2
          bg-gradient-to-r from-purple-600 to-pink-600
          text-white
          cursor-move
          ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}
        `}
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-white/30" />
          <h3 className="font-semibold text-sm truncate max-w-md">
            {window.title}
          </h3>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMinimize();
            }}
            className="p-1.5 hover:bg-white/20 rounded transition-colors"
            title="Minimize"
          >
            <Minus className="w-4 h-4" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              window.isMaximized ? onRestore() : onMaximize();
            }}
            className="p-1.5 hover:bg-white/20 rounded transition-colors"
            title={window.isMaximized ? "Restore" : "Maximize"}
          >
            {window.isMaximized ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="p-1.5 hover:bg-red-500 rounded transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-800">
        {children}
      </div>

      {/* Resize Handle */}
      {!window.isMaximized && (
        <div
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
          onMouseDown={handleResizeMouseDown}
        >
          <div className="absolute bottom-1 right-1 w-2 h-2 border-r-2 border-b-2 border-gray-400" />
        </div>
      )}
    </div>
  );
}
