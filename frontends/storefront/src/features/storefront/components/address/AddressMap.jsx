"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";

const DEFAULT_CENTER = [28.6139, 77.209];
const TILE_URL =
  process.env.NEXT_PUBLIC_MAP_TILE_URL || "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const markerIcon = L.divIcon({
  className: "acquireauto-map-marker",
  html: '<svg width="42" height="52" viewBox="0 0 42 52" aria-hidden="true"><path d="M21 1C9.95 1 1 9.95 1 21c0 15 20 30 20 30s20-15 20-30C41 9.95 32.05 1 21 1Z" fill="#2165f5" stroke="white" stroke-width="3"/><circle cx="21" cy="21" r="7" fill="white"/></svg>',
  iconSize: [42, 52],
  iconAnchor: [21, 50],
});

export default function AddressMap({ center, onMapLocation }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const callbackRef = useRef(onMapLocation);

  useEffect(() => {
    callbackRef.current = onMapLocation;
  }, [onMapLocation]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return undefined;

    const map = L.map(containerRef.current, {
      center: DEFAULT_CENTER,
      zoom: 14,
      zoomControl: true,
      scrollWheelZoom: false,
    });
    L.tileLayer(TILE_URL, {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>',
    }).addTo(map);

    const marker = L.marker(DEFAULT_CENTER, { icon: markerIcon, draggable: true }).addTo(map);
    map.on("click", (event) => {
      marker.setLatLng(event.latlng);
      callbackRef.current?.({ latitude: event.latlng.lat, longitude: event.latlng.lng });
    });
    marker.on("dragend", () => {
      const point = marker.getLatLng();
      callbackRef.current?.({ latitude: point.lat, longitude: point.lng });
    });

    mapRef.current = map;
    markerRef.current = marker;
    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!center || !mapRef.current || !markerRef.current) return;
    const point = [center.latitude, center.longitude];
    markerRef.current.setLatLng(point);
    mapRef.current.flyTo(point, Math.max(mapRef.current.getZoom(), 16), { duration: 0.7 });
  }, [center]);

  return (
    <div
      ref={containerRef}
      className="h-full min-h-[420px] w-full bg-[#e6e4dc] lg:min-h-0"
      aria-label="Interactive map; click or drag the pin to choose a location"
    />
  );
}
