const EARTH_RADIUS_METERS = 6_371_000;

function radians(value) {
  return value * Math.PI / 180;
}

function coordinates(point) {
  const { latitude, longitude } = point ?? {};
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new TypeError("Travel coordinates require finite latitude and longitude.");
  }
  return { latitude, longitude };
}

export function haversineDistanceMeters(from, to) {
  const start = coordinates(from);
  const end = coordinates(to);
  const latitudeDelta = radians(end.latitude - start.latitude);
  const longitudeDelta = radians(end.longitude - start.longitude);
  const value = Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(radians(start.latitude)) * Math.cos(radians(end.latitude)) *
    Math.sin(longitudeDelta / 2) ** 2;
  const distanceMeters = EARTH_RADIUS_METERS * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
  if (!Number.isFinite(distanceMeters)) {
    throw new TypeError("Travel coordinates cannot produce a finite Haversine distance.");
  }
  return distanceMeters;
}
