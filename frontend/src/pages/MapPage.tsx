import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useI18n } from "../i18n/i18nContext";
import { placeName } from "../i18n/placeNames";
import { localized } from "../i18n/localized";

const BASE = "/api/v1";

// ── Types ──────────────────────────────────────────────────────────────────

interface GeoFeature {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: {
    slug: string;
    name: string;
    place_type: string | null;
    verse_count: number;
    geo_confidence: number | null;
    thumbnail_url: string | null;
  };
}

interface GeoJSON {
  type: "FeatureCollection";
  features: GeoFeature[];
}

interface RouteWaypoint {
  name: string;
  lat: number;
  lon: number;
}

interface BibleRoute {
  id: string;
  name: string;
  name_pt?: string;
  name_es?: string;
  description: string;
  description_pt?: string;
  description_es?: string;
  era: string;
  color: string;
  waypoints: RouteWaypoint[];
}

// ── Custom marker icon ─────────────────────────────────────────────────────

const defaultIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const smallIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [15, 24],
  iconAnchor: [7, 24],
  popupAnchor: [1, -20],
  shadowSize: [24, 24],
});

const highlightedIcon = new L.DivIcon({
  html: `<div style="
    width:20px;height:20px;border-radius:50%;
    background:var(--color-gold,#b8860b);
    border:3px solid white;
    box-shadow:0 0 0 2px var(--color-gold,#b8860b),0 2px 8px rgba(0,0,0,.4);
  "></div>`,
  className: "",
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  popupAnchor: [0, -12],
});

// ── Fly to a place when navigating from /places ──────────────────────────

function FlyToPlace({ lat, lng, zoom }: { lat: number; lng: number; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], zoom, { duration: 1.2 });
  }, [map, lat, lng, zoom]);
  return null;
}

// ── Zoom-aware marker layer ────────────────────────────────────────────────

function MarkerLayer({ features, highlightSlug }: { features: GeoFeature[]; highlightSlug: string | null }) {
  const { t, locale } = useI18n();
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());

  useEffect(() => {
    const onZoom = () => setZoom(map.getZoom());
    map.on("zoomend", onZoom);
    return () => { map.off("zoomend", onZoom); };
  }, [map]);

  // At low zoom, only show top places; at high zoom show all
  const maxMarkers = zoom < 6 ? 30 : zoom < 8 ? 100 : zoom < 10 ? 300 : features.length;
  const visible = features.slice(0, maxMarkers);
  const icon = zoom < 8 ? smallIcon : defaultIcon;

  return (
    <>
      {visible.map((f) => {
        const localizedName = placeName(f.properties.slug, locale, f.properties.name);
        const isHighlighted = highlightSlug === f.properties.slug;
        return (
          <HighlightableMarker
            key={f.properties.slug}
            position={[f.geometry.coordinates[1], f.geometry.coordinates[0]]}
            icon={isHighlighted ? highlightedIcon : icon}
            zIndexOffset={isHighlighted ? 1000 : 0}
            autoOpen={isHighlighted}
          >
            <Popup>
              <div className="text-sm min-w-[140px]">
                {f.properties.thumbnail_url && (
                  <img
                    src={f.properties.thumbnail_url}
                    alt={localizedName}
                    className="w-full h-24 object-cover rounded mb-1.5"
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                )}
                <strong>{localizedName}</strong>
                {f.properties.place_type && (
                  <span className="ml-1 text-xs opacity-60">({f.properties.place_type})</span>
                )}
                <br />
                <span className="text-xs opacity-60">
                  {(f.properties.verse_count === 1 ? t("map.verseCountSingular") : t("map.verseCount"))
                    .replace("{n}", String(f.properties.verse_count))}
                </span>
                <br />
                <Link
                  to={`/places?q=${encodeURIComponent(f.properties.name)}`}
                  className="text-xs text-blue-600 hover:underline"
                >
                  {t("map.viewDetails")}
                </Link>
              </div>
            </Popup>
          </HighlightableMarker>
        );
      })}
    </>
  );
}

function HighlightableMarker({
  autoOpen,
  children,
  ...props
}: { autoOpen?: boolean } & React.ComponentProps<typeof Marker>) {
  const markerRef = useRef<L.Marker>(null);
  useEffect(() => {
    if (autoOpen && markerRef.current) {
      setTimeout(() => markerRef.current?.openPopup(), 600);
    }
  }, [autoOpen]);
  return <Marker ref={markerRef} {...props}>{children}</Marker>;
}

// ── Main Map Page ──────────────────────────────────────────────────────────

export default function MapPage() {
  const { t, locale } = useI18n();
  const [searchParams] = useSearchParams();
  const highlightSlug = searchParams.get("place");
  const [geojson, setGeojson] = useState<GeoJSON | null>(null);
  const [routes, setRoutes] = useState<BibleRoute[]>([]);
  const [activeRoutes, setActiveRoutes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [showPlaces, setShowPlaces] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`${BASE}/places/geo`).then((r) => r.json()),
      fetch(`${BASE}/places/routes`).then((r) => r.json()),
    ])
      .then(([geo, rts]) => {
        setGeojson(geo);
        setRoutes(rts.routes || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggleRoute = (id: string) => {
    setActiveRoutes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Sort features by verse_count desc for priority rendering
  const sortedFeatures = geojson
    ? [...geojson.features].sort(
        (a, b) => b.properties.verse_count - a.properties.verse_count
      )
    : [];

  const center: [number, number] = [31.5, 35.5];

  const highlightedFeature = highlightSlug
    ? sortedFeatures.find((f) => f.properties.slug === highlightSlug)
    : undefined;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--color-gold-dark)]/10 bg-white shrink-0">
        <div className="flex items-center justify-between max-w-none">
          <div>
            <h1 className="page-title text-xl">{t("map.title")}</h1>
            <p className="text-xs opacity-50">
              {t("map.subtitle").replace("{n}", sortedFeatures.length.toLocaleString())}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <div className="w-64 shrink-0 border-r border-[var(--color-gold-dark)]/10 bg-white overflow-y-auto hidden md:block">
          <div className="p-3 space-y-4">
            {/* Places toggle */}
            <div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={showPlaces}
                  onChange={(e) => setShowPlaces(e.target.checked)}
                  className="rounded"
                />
                <span>{t("map.showPlaces")}</span>
              </label>
            </div>

            {/* Routes */}
            <div>
              <h3 className="text-[10px] uppercase tracking-wider font-bold opacity-50 mb-2">
                {t("map.journeys")}
              </h3>
              <div className="space-y-1.5">
                {routes.map((route) => (
                  <label
                    key={route.id}
                    className="flex items-start gap-2 text-sm cursor-pointer group"
                  >
                    <input
                      type="checkbox"
                      checked={activeRoutes.has(route.id)}
                      onChange={() => toggleRoute(route.id)}
                      className="rounded mt-0.5"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-3 h-0.5 rounded shrink-0"
                          style={{ backgroundColor: route.color }}
                        />
                        <span className="font-medium text-xs">
                          {localized(route, locale, "name")}
                        </span>
                      </div>
                      <p className="text-[10px] opacity-50 mt-0.5 line-clamp-2">
                        {localized(route, locale, "description")}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Legend */}
            {activeRoutes.size > 0 && (
              <div>
                <h3 className="text-[10px] uppercase tracking-wider font-bold opacity-50 mb-2">
                  {t("map.activeRoutes")}
                </h3>
                {routes
                  .filter((r) => activeRoutes.has(r.id))
                  .map((route) => (
                    <div key={route.id} className="mb-2">
                      <div className="flex items-center gap-1.5 text-xs font-medium">
                        <span
                          className="w-4 h-0.5 rounded"
                          style={{ backgroundColor: route.color }}
                        />
                        {localized(route, locale, "name")}
                      </div>
                      <div className="text-[10px] opacity-40 ml-5.5 mt-0.5">
                        {t("map.waypoints").replace("{n}", String(route.waypoints.length))}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Map */}
        <div className="flex-1 relative">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-[1000]">
              <p className="text-sm opacity-50">{t("map.loading")}</p>
            </div>
          )}
          <MapContainer
            center={center}
            zoom={6}
            className="h-full w-full"
            zoomControl={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {highlightedFeature && (
              <FlyToPlace
                lat={highlightedFeature.geometry.coordinates[1]}
                lng={highlightedFeature.geometry.coordinates[0]}
                zoom={10}
              />
            )}

            {/* Place markers */}
            {showPlaces && sortedFeatures.length > 0 && (
              <MarkerLayer features={sortedFeatures} highlightSlug={highlightSlug} />
            )}

            {/* Journey routes */}
            {routes
              .filter((r) => activeRoutes.has(r.id))
              .map((route) => (
                <Polyline
                  key={route.id}
                  positions={route.waypoints.map((wp) => [wp.lat, wp.lon] as [number, number])}
                  pathOptions={{
                    color: route.color,
                    weight: 3,
                    opacity: 0.8,
                    dashArray: "8 4",
                  }}
                >
                  <Popup>
                    <strong>{localized(route, locale, "name")}</strong>
                    <br />
                    <span className="text-xs">{localized(route, locale, "description")}</span>
                  </Popup>
                </Polyline>
              ))}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}
