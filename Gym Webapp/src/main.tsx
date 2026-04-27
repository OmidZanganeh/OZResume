import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { RoutineRunView } from './RoutineRunView';
import './style.css';

const routineParam = new URLSearchParams(window.location.search).get('routine');
const root = (
  <React.StrictMode>
    {routineParam ? <RoutineRunView planId={routineParam} /> : <App />}
  </React.StrictMode>
);

ReactDOM.createRoot(document.getElementById('app')!).render(root);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    const base = import.meta.env.BASE_URL.endsWith('/')
      ? import.meta.env.BASE_URL
      : `${import.meta.env.BASE_URL}/`;
    navigator.serviceWorker.register(`${base}sw.js`).catch(() => {
      // Keep silent when service worker registration fails.
    });
  });
}
