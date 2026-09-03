import React, { useState, useRef, useEffect } from 'react';
import { View } from '../types';

interface WindowModalProps {
  id: View;
  title: string;
  isFocused: boolean;
  onClose: (id: View) => void;
  onFocus: (id: View) => void;
  children: React.ReactNode;
  initialWidth?: number;
  initialHeight?: number;
}

const WindowModal: React.FC<WindowModalProps> = ({ 
  id, title, isFocused, onClose, onFocus, children,
  initialWidth = 800, initialHeight = 600
}) => {
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // Randomize initial position slightly so windows don't overlap perfectly
  useEffect(() => {
      const offset = Math.random() * 50;
      setPosition({ x: 100 + offset, y: 100 + offset });
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isMaximized) return;
    onFocus(id);
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragOffset.x,
        y: Math.max(28, e.clientY - dragOffset.y) // Don't drag above menu bar
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  if (isMinimized) return null; // Simplified for now, just hide it

  return (
    <div 
      className={`absolute flex flex-col rounded-xl overflow-hidden transition-all duration-200 
        ${isFocused ? 'shadow-window-active z-[100]' : 'shadow-window-inactive z-[50]'}
        ${isMaximized ? 'inset-0 mt-[28px] !rounded-none !w-full !h-[calc(100vh-28px)]' : ''}
        bg-rios-windowLight dark:bg-rios-windowDark backdrop-blur-2xl border border-rios-borderGlass dark:border-rios-borderGlassDark animate-pop-in
      `}
      style={!isMaximized ? {
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${initialWidth}px`,
        height: `${initialHeight}px`,
        maxWidth: '90vw',
        maxHeight: '80vh'
      } : {}}
      onClick={() => onFocus(id)}
    >
      {/* Title Bar */}
      <div 
        className="h-[40px] flex items-center justify-between px-4 select-none shrink-0 border-b border-rios-borderGlass dark:border-rios-borderGlassDark"
        onMouseDown={handleMouseDown}
        onDoubleClick={() => setIsMaximized(!isMaximized)}
      >
        {/* Traffic Lights */}
        <div className="flex items-center gap-2 w-20">
          <button 
            onClick={(e) => { e.stopPropagation(); onClose(id); }}
            className="w-3 h-3 rounded-full bg-rios-close flex items-center justify-center group"
          >
            <span className="opacity-0 group-hover:opacity-100 text-[8px] font-bold text-black/50">x</span>
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); setIsMinimized(true); }}
            className="w-3 h-3 rounded-full bg-rios-minimize flex items-center justify-center group"
          >
            <span className="opacity-0 group-hover:opacity-100 text-[8px] font-bold text-black/50">-</span>
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); setIsMaximized(!isMaximized); }}
            className="w-3 h-3 rounded-full bg-rios-maximize flex items-center justify-center group"
          >
             <span className="opacity-0 group-hover:opacity-100 text-[8px] font-bold text-black/50">+</span>
          </button>
        </div>

        {/* Title */}
        <div className="flex-1 text-center font-semibold text-[13px] text-rios-textLight dark:text-rios-textDark tracking-tight">
          {title}
        </div>

        {/* Spacer for symmetry */}
        <div className="w-20"></div>
      </div>

      {/* Window Content */}
      <div className="flex-1 overflow-y-auto bg-white/50 dark:bg-black/50">
        {children}
      </div>
    </div>
  );
};

export default WindowModal;