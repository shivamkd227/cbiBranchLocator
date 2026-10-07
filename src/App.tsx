import { useEffect } from "react";
import { Header } from "./components/Header";
import { MapView } from "./components/MapView";
import { SidePanel } from "./components/SidePanel";
import { useMapNavigation } from "./hooks/useMapNavigation";

function Explorer() {
  const { nav, goToLevel, reset } = useMapNavigation();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      if (nav.level === "branch") goToLevel("district");
      else if (nav.level === "district") goToLevel("region");
      else if (nav.level === "region") goToLevel("zone");
      else if (nav.level === "zone") reset();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goToLevel, nav.level, reset]);

  return (
    <div className="flex h-dvh flex-col bg-mist text-ink">
      <Header />
      <div className="flex min-h-0 flex-1">
        <MapView />
        <SidePanel />
      </div>
    </div>
  );
}

export function App() {
  return <Explorer />;
}
