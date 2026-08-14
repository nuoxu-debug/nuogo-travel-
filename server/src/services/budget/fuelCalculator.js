function nonnegative(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) throw new TypeError(`${label} must be a nonnegative number.`);
  return number;
}

function cnyToFen(value) {
  return Math.round(nonnegative(value, "CNY amount") * 100);
}

export function calculateDrivingCost({
  distanceKm,
  fuelConsumptionLitresPer100Km,
  fuelPricePerLitre,
  tollCny = 0,
  parkingCny = 0
}) {
  const distance = nonnegative(distanceKm, "distanceKm");
  const consumption = nonnegative(fuelConsumptionLitresPer100Km, "fuelConsumptionLitresPer100Km");
  const fuelPrice = nonnegative(fuelPricePerLitre, "fuelPricePerLitre");
  const fuelFen = Math.round((distance * consumption / 100) * fuelPrice * 100);
  const tollFen = cnyToFen(tollCny);
  const parkingFen = cnyToFen(parkingCny);
  return { fuelFen, tollFen, parkingFen, totalFen: fuelFen + tollFen + parkingFen };
}
