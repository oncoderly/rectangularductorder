import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './custom.css'
import App from './App.tsx'

console.log('🚀 main.tsx: Starting React application...');
console.log('🌍 Environment:', {
  NODE_ENV: import.meta.env.MODE,
  API_URL: import.meta.env.VITE_API_URL,
  BASE_URL: import.meta.env.BASE_URL
});

const rootElement = document.getElementById('root');
console.log('📄 main.tsx: Root element found:', !!rootElement);

if (rootElement) {
  console.log('✅ main.tsx: Creating React root and rendering App...');
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
} else {
  console.error('❌ main.tsx: Root element not found! Check index.html');
}
