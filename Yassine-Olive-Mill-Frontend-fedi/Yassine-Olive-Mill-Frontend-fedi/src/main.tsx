import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Add error boundary and logging
console.log("React app starting...");
console.log("Root element:", document.getElementById("root"));

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
