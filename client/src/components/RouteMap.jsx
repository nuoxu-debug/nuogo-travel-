import AmapRouteMap from "./AmapRouteMap.jsx";
import LeafletRouteMap from "./LeafletRouteMap.jsx";

export function selectRouteMapProvider({ apiKey, hasEstimatedLocation }) {
  return apiKey && !hasEstimatedLocation ? "amap" : "leaflet";
}

export default function RouteMap(props) {
  const apiKey = import.meta.env.VITE_AMAP_KEY;
  const hasEstimatedLocation = props.activities.some((activity) => activity.locationIsEstimated);
  return selectRouteMapProvider({ apiKey, hasEstimatedLocation }) === "amap"
    ? <AmapRouteMap apiKey={apiKey} {...props} />
    : <LeafletRouteMap {...props} />;
}
