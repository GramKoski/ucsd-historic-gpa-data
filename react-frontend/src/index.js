// Import React and ReactDOM correctly
import React from 'react';
import { createRoot } from 'react-dom/client'; // <-- Correct import for React 18+
import App from './App';

// Create a root instance
const root = createRoot(document.getElementById('root'));

// Render your app
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
