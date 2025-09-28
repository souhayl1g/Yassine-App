import React, { createContext, useContext, useState, useEffect } from 'react';

interface FullscreenContextType {
  isFullscreen: boolean;
  enterFullscreen: () => Promise<void>;
  exitFullscreen: () => Promise<void>;
  toggleFullscreen: () => Promise<void>;
}

const FullscreenContext = createContext<FullscreenContextType | undefined>(undefined);

export function FullscreenProvider({ children }: { children: React.ReactNode }) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const enterFullscreen = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch (error) {
      console.error('Error entering fullscreen:', error);
      throw error;
    }
  };

  const exitFullscreen = async () => {
    try {
      if (document.exitFullscreen && document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error('Error exiting fullscreen:', error);
      throw error;
    }
  };

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await enterFullscreen();
      } else {
        await exitFullscreen();
      }
    } catch (error) {
      console.error('Error toggling fullscreen:', error);
      throw error;
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const value: FullscreenContextType = {
    isFullscreen,
    enterFullscreen,
    exitFullscreen,
    toggleFullscreen,
  };

  return (
    <FullscreenContext.Provider value={value}>
      {children}
    </FullscreenContext.Provider>
  );
}

export function useFullscreen() {
  const context = useContext(FullscreenContext);
  if (context === undefined) {
    throw new Error('useFullscreen must be used within a FullscreenProvider');
  }
  return context;
}
