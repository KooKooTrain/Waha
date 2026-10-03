import { useEffect, type ReactNode } from 'react';
import { MapContainer, TileLayer, ZoomControl, useMap, useMapEvents } from 'react-leaflet';
import type { LatLngBoundsExpression, LatLngExpression, LeafletMouseEvent } from 'leaflet';
import { AREA_BOUNDS } from '@waha/shared';
import { cx } from './kit';

const TILES = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}';
const ATTRIBUTION = 'Tiles &copy; Esri &middot; Outlines &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

/** The whole of the patch Waha covers: Abu Dhabi City, Mussafah and MBZ. */
export const AREA: LatLngBoundsExpression = [[AREA_BOUNDS.south, AREA_BOUNDS.west], [AREA_BOUNDS.north, AREA_BOUNDS.east]];
export const START: LatLngExpression = [24.42, 54.46];

/** Esri street tiles, washed toward white in index.css so it reads like a normal street map. */
export function BaseMap({ children, className, zoom = 11, onClick, crosshair }: {
  children?: ReactNode; className?: string; zoom?: number; onClick?: (e: LeafletMouseEvent) => void; crosshair?: boolean;
}) {
  return (
    <MapContainer
      center={START}
      zoom={zoom}
      minZoom={10}
      maxBounds={AREA}
      maxBoundsViscosity={0.8}
      zoomControl={false}
      className={cx('waha-map size-full bg-lagoon-800', crosshair && 'cursor-crosshair', className)}
    >
      <TileLayer url={TILES} attribution={ATTRIBUTION} maxZoom={19} maxNativeZoom={18} />
      <ZoomControl position="bottomright" />
      {onClick && <ClickHandler onClick={onClick} />}
      {children}
    </MapContainer>
  );
}

function ClickHandler({ onClick }: { onClick: (e: LeafletMouseEvent) => void }) {
  useMapEvents({ click: onClick });
  return null;
}

/** Fits the view to some points whenever the key changes. */
export function FitTo({ points, fitKey, maxZoom = 14 }: { points: [number, number][]; fitKey: string; maxZoom?: number }) {
  const map = useMap();
  useEffect(() => {
    if (points.length) map.fitBounds(points, { padding: [40, 40], maxZoom });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey]);
  return null;
}

export function FlyTo({ to, zoom = 15 }: { to?: [number, number]; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    if (to) map.flyTo(to, Math.max(map.getZoom(), zoom), { duration: 0.6 });
  }, [to, zoom, map]);
  return null;
}

/** Leaflet measures its box on mount; drawers that slide in need a nudge once they land. */
export function InvalidateSize() {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 350);
    return () => clearTimeout(t);
  }, [map]);
  return null;
}
