// Static fare schedule (PHP) — this system has no payment/pricing model,
// so ticket "revenue" is estimated from a fixed per-class fare table
// rather than a real transaction amount.
const FARE_TABLE = {
  ECONOMY: 180,
  TOURIST_AIRCON: 250,
  BUSINESS: 400,
};
const DEFAULT_FARE = 150;
// Student / Senior Citizen / PWD discount — a flat rate under RA 9994 (Expanded
// Senior Citizens Act) and RA 10754 (PWD) style fare discounts, applied via the
// passenger's discount toggle rather than a dedicated passenger-type category.
const DISCOUNT_RATE = 0.2;

function isDiscountEligible(passenger) {
  return !!(passenger?.isStudent || passenger?.isSeniorCitizen || passenger?.isPWD);
}

function getFare(trip) {
  const base =
    trip.accommodationClass && FARE_TABLE[trip.accommodationClass] != null
      ? FARE_TABLE[trip.accommodationClass]
      : DEFAULT_FARE;
  if (isDiscountEligible(trip.passenger)) {
    return Math.round(base * (1 - DISCOUNT_RATE) * 100) / 100;
  }
  return base;
}

module.exports = { FARE_TABLE, DEFAULT_FARE, DISCOUNT_RATE, isDiscountEligible, getFare };
