import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ThemeProvider } from './ThemeContext.tsx';
import { AuthProvider } from './AuthContext.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <ThemeProvider>
    <AuthProvider>
      <App />
    </AuthProvider>
  </ThemeProvider>
);
