import { useEffect, useRef, useState } from "react";
import { MapContainer, useMap, ZoomControl } from "react-leaflet";
import L from "leaflet";
import { districtCollection, featureIdsForSelection, stateCollection, type FeatureNetwork, type MapFeature } from "../lib/geoJoin";
import { formatCount, formatLabel } from "../lib/format";
import { useBranchData } from "../hooks/useBranchData";
import { useMapNavigation } from "../hooks/useMapNavigation";
import { MapLegend } from "./MapLegend";
import { SearchBar } from "./SearchBar";
import type { NavigationState } from "../types";

const INDIA_BOUNDS = L.latLngBounds([6.4, 68.1], [35.6, 97.45]);
const AUTO_MAX_ZOOM = 6.5;

function expandBounds(bounds: L.LatLngBounds, factor: number): L.LatLngBounds {
  const sw = bounds.getSouthWest();
  const ne = bounds.getNorthEast();
  const latPad = Math.max((ne.lat - sw.lat) * factor, 1.1);
  const lngPad = Math.max((ne.lng - sw.lng) * factor, 1.1);
  return L.latLngBounds([sw.lat - latPad, sw.lng - lngPad], [ne.lat + latPad, ne.lng + lngPad]);
}

function districtMapName(entry: FeatureNetwork | undefined, geoName: string): string {
  if (entry && entry.districtCounts.length === 1) return formatLabel(entry.districtCounts[0].district);
  return formatLabel(geoName);
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    const map: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return map[char] ?? char;
  });
}

function tooltipHtml(entry: FeatureNetwork | undefined, fallback: string): string {
  if (!entry || entry.branches.length === 0) {
    return `<strong>${escapeHtml(fallback)}</strong><p>No Central Bank of India branches</p>`;
  }
  const district =
    entry.districtCounts.length === 1 ? formatLabel(entry.districtCounts[0].district) : formatLabel(entry.geoDistrict);
  const zone = entry.zoneCounts.map((item) => formatLabel(item.zoneName)).slice(0, 2).join(", ");
  const region = entry.regionCounts.map((item) => formatLabel(item.regionName)).slice(0, 2).join(", ");
  const extraDistricts =
    entry.districtCounts.length > 1
      ? `<p>Includes ${escapeHtml(entry.districtCounts.map((item) => formatLabel(item.district)).slice(0, 3).join(", "))}</p>`
      : "";
  return `<strong>${escapeHtml(district)}</strong><p>Zone: ${escapeHtml(zone || "—")}</p><p>Region: ${escapeHtml(region || "—")}</p><p>Branches: ${formatCount(entry.branches.length)}</p>${extraDistricts}`;
}

function styleFor(
  featureId: string,
  entry: FeatureNetwork | undefined,
  zoneColors: Record<string, string>,
  nav: NavigationState,
  hoverId: string | null,
  activeIds: Set<string> | null,
): L.PathOptions {
  const hasBranches = (entry?.branches.length ?? 0) > 0;
  const active = activeIds ? activeIds.has(featureId) : hasBranches;
  const dim = Boolean(activeIds) && !active;
  const hovered = hoverId === featureId;
  const selected =
    (nav.level === "district" || nav.level === "branch") && active && Boolean(nav.district);
  const fill = entry?.dominantZoneId ? zoneColors[entry.dominantZoneId] : "#b7c3d1";
  return {
    fillColor: hasBranches ? fill : "#c5d0dc",
    fillOpacity: dim ? 0.34 : hovered || selected ? 0.96 : hasBranches ? 0.9 : 0.55,
    color: selected ? "#0b1c33" : hovered ? "#0f2744" : "#f8fafc",
    weight: selected ? 2.2 : hovered ? 1.6 : 0.7,
    opacity: 1,
  };
}

function activeFeatureIds(nav: NavigationState, network: Map<string, FeatureNetwork>): Set<string> | null {
  if (nav.level === "india") return null;
  if (nav.level === "zone" && nav.zoneId) {
    return featureIdsForSelection(network, (branch) => branch.zone_id === nav.zoneId);
  }
  if (nav.level === "region" && nav.regionId) {
    return featureIdsForSelection(network, (branch) => branch.region_id === nav.regionId);
  }
  if ((nav.level === "district" || nav.level === "branch") && nav.regionId && nav.state && nav.district) {
    return featureIdsForSelection(
      network,
      (branch) => branch.region_id === nav.regionId && branch.state === nav.state && branch.district === nav.district,
    );
  }
  return new Set();
}

function NetworkLayers() {
  const map = useMap();
  const { network, zoneColors } = useBranchData();
  const { nav, openZone, openRegion, openDistrict } = useMapNavigation();
  const layerRef = useRef<L.GeoJSON | null>(null);
  const navRef = useRef(nav);
  const activeIdsRef = useRef<Set<string> | null>(null);
  const frameRef = useRef("");
  const syncLabelsRef = useRef<() => void>(() => {});
  navRef.current = nav;

  useEffect(() => {
    const tip = L.tooltip({ className: "cbi-tip", sticky: true, opacity: 1 });
    let ignoreClicks = false;
    if (!map.getPane("districtLabels")) {
      const pane = map.createPane("districtLabels");
      pane.style.zIndex = "620";
      pane.style.pointerEvents = "none";
    }
    const labelPane = map.getPane("districtLabels");
    const labelNodes = new Map<string, HTMLDivElement>();
    const syncLabels = () => {
      if (!labelPane) return;
      const current = navRef.current;
      if (current.level === "india") {
        labelNodes.forEach((node) => node.remove());
        labelNodes.clear();
        labelPane.style.visibility = "hidden";
        return;
      }
      const size = map.getSize();
      const view = map.getBounds();
      const activeIds = activeIdsRef.current;
      const candidates: { id: string; name: string; center: L.LatLng; area: number; active: boolean }[] = [];
      districts.eachLayer((child) => {
        const feature = (child as L.Layer & { feature?: GeoJSON.Feature }).feature;
        const props = feature?.properties as MapFeature["properties"] | undefined;
        const path = child as L.Polygon;
        if (!props || !path.getBounds) return;
        const polygonBounds = path.getBounds();
        const center = polygonBounds.getCenter();
        if (!view.contains(center)) return;
        const entry = network.get(props.id);
        candidates.push({
          id: props.id,
          name: districtMapName(entry, props.district),
          center,
          area: Math.abs(polygonBounds.getNorth() - polygonBounds.getSouth()) * Math.abs(polygonBounds.getEast() - polygonBounds.getWest()),
          active: activeIds ? activeIds.has(props.id) : true,
        });
      });
      candidates.sort((a, b) => Number(b.active) - Number(a.active) || b.area - a.area);
      const placed: { x: number; y: number; w: number; h: number }[] = [];
      const keep = new Set<string>();
      for (const candidate of candidates) {
        if (!candidate.name) continue;
        const point = map.latLngToContainerPoint(candidate.center);
        const width = Math.min(76, Math.max(32, candidate.name.length * 6.2));
        const lines = Math.max(1, Math.ceil((candidate.name.length * 6.2) / 76));
        const box = { x: point.x - width / 2, y: point.y - lines * 6.5, w: width, h: lines * 13 };
        if (box.x < 4 || box.y < 4 || box.x + box.w > size.x - 4 || box.y + box.h > size.y - 4) continue;
        if (placed.some((existing) => box.x < existing.x + existing.w + 4 && box.x + box.w + 4 > existing.x && box.y < existing.y + existing.h + 3 && box.y + box.h + 3 > existing.y)) {
          continue;
        }
        placed.push(box);
        keep.add(candidate.id);
        const layerPoint = map.latLngToLayerPoint(candidate.center);
        let node = labelNodes.get(candidate.id);
        if (!node) {
          node = document.createElement("div");
          node.className = "cbi-dist-label";
          labelPane.appendChild(node);
          labelNodes.set(candidate.id, node);
        }
        node.textContent = candidate.name;
        node.style.transform = `translate3d(${layerPoint.x}px, ${layerPoint.y}px, 0) translate(-50%, -50%)`;
      }
      labelNodes.forEach((node, id) => {
        if (keep.has(id)) return;
        node.remove();
        labelNodes.delete(id);
      });
      labelPane.style.visibility = "visible";
    };
    syncLabelsRef.current = syncLabels;
    const hideLabelsDuringZoom = () => {
      if (labelPane) labelPane.style.visibility = "hidden";
    };

    const onMoveStart = () => {
      ignoreClicks = true;
      map.closeTooltip(tip);
    };
    const onMoveEnd = () => {
      ignoreClicks = false;
      syncLabels();
    };
    map.on("movestart", onMoveStart);
    map.on("zoomstart", hideLabelsDuringZoom);
    map.on("moveend", onMoveEnd);

    let hovered: L.Path | null = null;
    let hoveredId: string | null = null;
    const paint = (path: L.Path, id: string, hover: boolean) => {
      path.setStyle(styleFor(id, network.get(id), zoneColors, navRef.current, hover ? id : null, activeIdsRef.current));
    };

    const districts = L.geoJSON(districtCollection as unknown as GeoJSON.FeatureCollection, {
      style: (feature) => {
        const props = feature?.properties as MapFeature["properties"] | undefined;
        const id = props?.id ?? "";
        return styleFor(id, network.get(id), zoneColors, navRef.current, null, null);
      },
      onEachFeature: (feature, layer) => {
        const props = feature.properties as MapFeature["properties"];
        layer.on("mouseover", (event) => {
          const path = layer as L.Path;
          if (hovered && hovered !== path && hoveredId) paint(hovered, hoveredId, false);
          hovered = path;
          hoveredId = props.id;
          paint(path, props.id, true);
          const label = labelNodes.get(props.id);
          if (label) label.style.visibility = "hidden";
          const entry = network.get(props.id);
          tip.setContent(tooltipHtml(entry, formatLabel(props.district)));
          tip.setLatLng(event.latlng);
          map.openTooltip(tip);
          tip.getElement()?.parentElement?.appendChild(tip.getElement() as HTMLElement);
        });
        layer.on("mouseout", () => {
          const label = labelNodes.get(props.id);
          if (label) label.style.visibility = "";
          if (hoveredId === props.id && hovered) paint(hovered, props.id, false);
          if (hoveredId === props.id) {
            hovered = null;
            hoveredId = null;
          }
          map.closeTooltip(tip);
        });
        layer.on("click", () => {
          if (ignoreClicks) return;
          const entry = network.get(props.id);
          if (!entry || entry.branches.length === 0) return;
          const current = navRef.current;
          if (current.level === "india") {
            if (entry.dominantZoneId) openZone(entry.dominantZoneId);
            return;
          }
          const zoneId = current.zoneId ?? entry.dominantZoneId;
          if (!zoneId) return;
          const inZone = entry.branches.filter((branch) => branch.zone_id === zoneId);
          if (inZone.length === 0) {
            if (entry.dominantZoneId) openZone(entry.dominantZoneId);
            return;
          }
          const regionCounts = new Map<string, number>();
          for (const branch of inZone) regionCounts.set(branch.region_id, (regionCounts.get(branch.region_id) ?? 0) + 1);
          const regionId =
            current.level === "region" || current.level === "district" || current.level === "branch"
              ? current.regionId && regionCounts.has(current.regionId)
                ? current.regionId
                : [...regionCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
              : [...regionCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
          if (!regionId) return;
          const inRegion = inZone.filter((branch) => branch.region_id === regionId);
          const districtCounts = new Map<string, { state: string; district: string; count: number }>();
          for (const branch of inRegion) {
            const key = `${branch.state}||${branch.district}`;
            const row = districtCounts.get(key) ?? { state: branch.state, district: branch.district, count: 0 };
            row.count += 1;
            districtCounts.set(key, row);
          }
          const top = [...districtCounts.values()].sort((a, b) => b.count - a.count)[0];
          if (current.level === "zone" && districtCounts.size > 1) {
            openRegion(zoneId, regionId);
            return;
          }
          if (top) openDistrict(zoneId, regionId, top.state, top.district);
          else openRegion(zoneId, regionId);
        });
      },
    });
    if (!map.getPane("stateBounds")) {
      const pane = map.createPane("stateBounds");
      pane.style.zIndex = "450";
      pane.style.pointerEvents = "none";
    }
    const states = L.geoJSON(stateCollection as unknown as GeoJSON.FeatureCollection, {
      pane: "stateBounds",
      interactive: false,
      style: {
        color: "#7d8da0",
        weight: 1.6,
        opacity: 1,
        fill: false,
        fillOpacity: 0,
        lineCap: "round",
        lineJoin: "round",
      },
    });
    districts.addTo(map);
    states.addTo(map);
    layerRef.current = districts;
    frameRef.current = "";
    map.fitBounds(INDIA_BOUNDS, { padding: [12, 12], animate: false });

    return () => {
      map.off("movestart", onMoveStart);
      map.off("zoomstart", hideLabelsDuringZoom);
      map.off("moveend", onMoveEnd);
      map.closeTooltip(tip);
      labelNodes.forEach((node) => node.remove());
      labelNodes.clear();
      syncLabelsRef.current = () => {};
      districts.remove();
      states.remove();
      layerRef.current = null;
    };
  }, [map, network, openDistrict, openRegion, openZone, zoneColors]);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    const activeIds = activeFeatureIds(nav, network);
    activeIdsRef.current = activeIds;
    layer.eachLayer((child) => {
      const feature = (child as L.Layer & { feature?: GeoJSON.Feature }).feature;
      const props = feature?.properties as MapFeature["properties"] | undefined;
      if (!props) return;
      (child as L.Path).setStyle(styleFor(props.id, network.get(props.id), zoneColors, nav, null, activeIds));
    });
  }, [nav, network, zoneColors]);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    const frameKey = nav.level === "india" ? "india" : (nav.zoneId ?? "india");
    if (frameRef.current === frameKey) {
      syncLabelsRef.current();
      return;
    }
    frameRef.current = frameKey;
    if (frameKey === "india" || !nav.zoneId) {
      map.fitBounds(INDIA_BOUNDS, { padding: [16, 16], animate: false });
      return;
    }
    const ids = featureIdsForSelection(network, (branch) => branch.zone_id === nav.zoneId);
    const bounds = L.latLngBounds([]);
    layer.eachLayer((child) => {
      const feature = (child as L.Layer & { feature?: GeoJSON.Feature }).feature;
      const id = (feature?.properties as MapFeature["properties"] | undefined)?.id;
      if (!id || !ids.has(id)) return;
      const path = child as L.Polygon;
      if (path.getBounds) bounds.extend(path.getBounds());
    });
    if (bounds.isValid()) {
      map.fitBounds(expandBounds(bounds, 0.18), {
        padding: [28, 28],
        maxZoom: AUTO_MAX_ZOOM,
        animate: false,
      });
    }
  }, [map, nav.level, nav.zoneId, network]);

  return null;
}

export function MapView() {
  const [ready, setReady] = useState(false);
  const { totals } = useBranchData();

  return (
    <div className="relative z-0 min-h-0 min-w-0 flex-1">
      <SearchBar className="absolute left-3 right-3 top-3 z-[800] md:hidden" />
      {!ready && (
        <div className="absolute inset-0 z-[450] grid place-items-center bg-mist/80 text-sm text-slate-600">
          <div className="rounded-2xl border border-line bg-white px-4 py-3 shadow-card">
            <p>Loading map...</p>
            <p className="mt-1 text-xs text-slate-500">Loading branch data... {totals.branches ? `${totals.branches.toLocaleString("en-IN")} branches` : ""}</p>
          </div>
        </div>
      )}
      <MapContainer
        bounds={INDIA_BOUNDS}
        maxBounds={L.latLngBounds([2, 62], [39, 104])}
        maxBoundsViscosity={0.85}
        minZoom={4}
        maxZoom={10}
        preferCanvas
        inertia={false}
        zoomSnap={1}
        wheelPxPerZoomLevel={120}
        zoomAnimation={false}
        fadeAnimation={false}
        markerZoomAnimation={false}
        zoomControl={false}
        attributionControl={false}
        className="h-full w-full"
        whenReady={() => setReady(true)}
      >
        <ZoomControl position="topright" />
        <NetworkLayers />
      </MapContainer>
      <MapLegend />
    </div>
  );
}
