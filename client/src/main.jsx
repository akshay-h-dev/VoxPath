import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { SessionProvider } from './context/SessionContext';
import './index.css';
import { AuthProvider } from "./context/AuthContext";

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <AuthProvider>
      <SessionProvider>
        <App />
      </SessionProvider>
    </AuthProvider>
  </BrowserRouter>
);
