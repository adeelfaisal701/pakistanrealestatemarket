"use client";

import { useEffect, useRef, useState } from "react";
import L, { type Map as LeafletMap, type Marker } from "leaflet";

export interface ExactCoordinates {
  latitude: number;
  longitude: number;
}

interface ExactLocationMapProps {
  latitude: number | null;
  longitude: number | null;
  onChange?: (coordinates: ExactCoordinates) => void;
  readOnly?: boolean;
}

const PAKISTAN_CENTER: [number, number] = [30.3753, 69.3451];

function createMarker(
  map: LeafletMap,
  point: L.LatLngExpression,
  onChange: ((coordinates: ExactCoordinates) => void) | undefined,
  readOnly: boolean,
): Marker {
  const marker = L.marker(point, {
    draggable: !readOnly,
    icon: L.divIcon({
      className: "",
      html: '<span style="display:block;width:18px;height:18px;border:3px solid white;border-radius:50%;background:#059669;box-shadow:0 1px 5px #0f172a"></span>',
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    }),
  }).addTo(map);
  if (!readOnly) {
    marker.on("dragend", () => {
      const position = marker.getLatLng();
      onChange?.({ latitude: position.lat, longitude: position.lng });
    });
  }
  return marker;
}

export default function ExactLocationMap({
  latitude,
  longitude,
  onChange,
  readOnly = false,
}: ExactLocationMapProps) {
  const mapElement = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const changeRef = useRef(onChange);
  const [tileError, setTileError] = useState(false);

  changeRef.current = onChange;

  useEffect(() => {
    if (!mapElement.current) return;

    const coordinates = getValidCoordinates(latitude, longitude);
    const center = coordinates ?? PAKISTAN_CENTER;
    const map = L.map(mapElement.current).setView(center, coordinates ? 17 : 5);
    mapRef.current = map;
    const tileLayer = L.tileLayer(
      process.env.NEXT_PUBLIC_OSM_TILE_URL ||
        "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
      },
    ).addTo(map);

    tileLayer.on("tileerror", () => setTileError(true));

    const selectPoint = (point: L.LatLng) => {
      if (readOnly) return;
      if (markerRef.current) {
        markerRef.current.setLatLng(point);
      } else {
        markerRef.current = createMarker(
          map,
          point,
          changeRef.current,
          readOnly,
        );
      }
      changeRef.current?.({ latitude: point.lat, longitude: point.lng });
    };

    if (!readOnly) map.on("click", (event) => selectPoint(event.latlng));

    return () => {
      markerRef.current = null;
      mapRef.current = null;
      map.remove();
    };
  }, [readOnly]);

  useEffect(() => {
    const map = mapRef.current;
    const coordinates = getValidCoordinates(latitude, longitude);
    if (!map || !coordinates) return;
    if (markerRef.current) {
      markerRef.current.setLatLng(coordinates);
    } else {
      markerRef.current = createMarker(
        map,
        coordinates,
        changeRef.current,
        readOnly,
      );
    }
  }, [latitude, longitude, readOnly]);

  return (
    <div className="space-y-2">
      <div
        ref={mapElement}
        className="h-72 w-full overflow-hidden rounded-xl border border-slate-300 dark:border-slate-700"
        aria-label={readOnly ? "Map showing the private property entrance" : "Select the exact property entrance on the map"}
      />
      {tileError && (
        <p role="status" className="text-xs text-amber-700 dark:text-amber-300">
          Map tiles are unavailable. You can still use the coordinate fields and directions link.
        </p>
      )}
      {!readOnly && (
        <p className="text-xs text-slate-500">
          Click the entrance on the map or drag the marker to refine its position.
        </p>
      )}
    </div>
  );
}

function getValidCoordinates(
  latitude: number | null,
  longitude: number | null,
): [number, number] | null {
  return (
    typeof latitude === "number" &&
    Number.isFinite(latitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    typeof longitude === "number" &&
    Number.isFinite(longitude) &&
    longitude >= -180 &&
    longitude <= 180
  )
    ? [latitude, longitude]
    : null;
}
