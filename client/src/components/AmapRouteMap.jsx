import { useEffect, useRef } from "react";

let amapPromise;

function loadAmap(key) {
  if (window.AMap) return Promise.resolve(window.AMap);
  if (!amapPromise) {
    amapPromise = new Promise((resolve, reject) => {
      const callback = `nuogoAmapReady${Date.now()}`;
      window[callback] = () => {
        resolve(window.AMap);
        delete window[callback];
      };
      const script = document.createElement("script");
      script.src = `https://webapi.amap.com/maps?v=2.0&key=${encodeURIComponent(key)}&callback=${callback}`;
      script.onerror = () => reject(new Error("Amap failed to load."));
      document.head.appendChild(script);
    });
  }
  return amapPromise;
}

export default function AmapRouteMap({ apiKey, activities, selectedActivityId, onSelect }) {
  const element = useRef(null);

  useEffect(() => {
    let map;
    let cancelled = false;
    loadAmap(apiKey).then((AMap) => {
      if (cancelled || !element.current) return;
      map = new AMap.Map(element.current, {
        zoom: 13,
        center: [activities[0].location.longitude, activities[0].location.latitude]
      });
      const path = activities.map((activity) => [activity.location.longitude, activity.location.latitude]);
      const markers = activities.map((activity) => {
        const marker = new AMap.Marker({
          position: [activity.location.longitude, activity.location.latitude],
          title: activity.name.en
        });
        marker.on("click", () => onSelect(activity.id));
        return marker;
      });
      map.add(markers);
      map.add(new AMap.Polyline({ path, strokeColor: "#e44d32", strokeWeight: 5 }));
      const selected = activities.find((activity) => activity.id === selectedActivityId);
      if (selected) map.setCenter([selected.location.longitude, selected.location.latitude]);
      map.setFitView();
    }).catch(() => {});
    return () => {
      cancelled = true;
      map?.destroy();
    };
  }, [activities, apiKey, onSelect, selectedActivityId]);

  return <div ref={element} data-testid="route-map-panel" className="h-[280px] w-full sm:h-[300px] xl:h-[320px]" aria-label="Amap route map" />;
}
