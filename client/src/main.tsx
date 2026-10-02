import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router';
import 'leaflet/dist/leaflet.css';
import './index.css';
import { Kit } from './pages/Kit';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/kit" element={<Kit />} />
        <Route path="*" element={<h1 className="p-8 text-6xl tracking-heading">Waha</h1>} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
