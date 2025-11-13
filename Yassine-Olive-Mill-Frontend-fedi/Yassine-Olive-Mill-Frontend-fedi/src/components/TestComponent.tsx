import React from 'react';

export function TestComponent() {
  return (
    <div className="fixed top-4 right-4 bg-red-600 text-white p-4 z-[9999] rounded-lg border-4 border-yellow-400 shadow-2xl animate-bounce">
      <h1 className="text-xl font-bold">🚨 TEST COMPONENT ACTIVE 🚨</h1>
      <p className="text-sm">If you see this, changes ARE being applied!</p>
      <p className="text-xs">Time: {new Date().toLocaleTimeString()}</p>
    </div>
  );
}
