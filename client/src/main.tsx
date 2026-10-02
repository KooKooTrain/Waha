import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router';
import 'leaflet/dist/leaflet.css';
import './index.css';
import { useReports } from './store/reports';
import { Layout } from './ui/Layout';
import { Buildings } from './pages/Buildings';
import { Community } from './pages/Community';
import { Dashboard } from './pages/Dashboard';
import { Kit } from './pages/Kit';
import { Landing } from './pages/Landing';
import { MapPage } from './pages/MapPage';
import { Methodology } from './pages/Methodology';
import { Rainfall } from './pages/Rainfall';

// Pull the server's reports and merge them with whatever this browser already has.
useReports.getState().load();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/kit" element={<Kit />} />
        <Route element={<Layout />}>
          <Route path="/buildings" element={<Buildings />} />
          <Route path="/rainfall" element={<Rainfall />} />
          <Route path="/community" element={<Community />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/methodology" element={<Methodology />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);

function NotFound() {
  return (
    <main className="mx-auto max-w-[1180px] px-6 py-32">
      <h1 className="m-0 text-6xl tracking-heading">Nothing here</h1>
      <p className="mt-4 text-mist-200">That page dried up. Try the map instead.</p>
    </main>
  );
}
