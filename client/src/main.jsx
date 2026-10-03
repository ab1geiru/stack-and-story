import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Global tokens and base styles load first so component CSS Modules can refine them.
import './styles/global.css';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
