import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// PWA viewport lock - prevents zoom on mobile
function preventZoom() {
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  document.addEventListener('gesturechange', (e) => e.preventDefault());
  document.addEventListener('gestureend', (e) => e.preventDefault());
  
  // Prevent double-tap zoom
  let lastTouchEnd = 0;
  document.addEventListener('touchend', (event) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
      event.preventDefault();
    }
    lastTouchEnd = now;
  }, false);
}

// Detect if running as PWA
const isPWA = window.matchMedia('(display-mode: standalone)').matches 
  || (window.navigator as any).standalone 
  || document.referrer.includes('android-app://');

if (isPWA) {
  console.log('Running as PWA - applying mobile optimizations');
  preventZoom();
  
  // Add PWA-specific class to body
  document.body.classList.add('pwa-mode');
  
  // Prevent pull-to-refresh
  document.body.style.overscrollBehavior = 'none';
}

// Add error boundary and logging
console.log("React app starting...");
console.log("Root element:", document.getElementById("root"));
console.log("PWA Mode:", isPWA);

try {
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    throw new Error("Root element not found!");
  }
  
  const root = createRoot(rootElement);
  root.render(<App />);
  console.log("React app rendered successfully!");
} catch (error) {
  console.error("Error rendering React app:", error);
  // Fallback: show error message
  document.getElementById("root")!.innerHTML = `
    <div style="padding: 20px; text-align: center; font-family: Arial, sans-serif;">
      <h1>Error Loading Application</h1>
      <p>There was an error loading the React application.</p>
      <p>Error: ${error}</p>
      <p>Please check the browser console for more details.</p>
    </div>
  `;
}
