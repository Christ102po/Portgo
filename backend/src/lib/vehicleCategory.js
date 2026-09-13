const CATEGORY_MAP = {
  MOTORCYCLE: "motorcycle",
  SEDAN_SUV: "car",
  TRUCK_CARGO: "cargo",
};

function categorizeVehicle(vehicleType) {
  return CATEGORY_MAP[vehicleType] || "other";
}

module.exports = { categorizeVehicle };
