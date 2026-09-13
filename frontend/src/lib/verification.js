const PASSENGER_TYPE_LABEL = {
  LOCAL_RESIDENT: "Local Resident",
  LOCAL_TOURIST: "Local Tourist",
  FOREIGN_TOURIST: "Foreign Tourist",
};

export function passengerTypeLabel(passengerType) {
  return PASSENGER_TYPE_LABEL[passengerType] || passengerType;
}

export function verificationBadge(passenger) {
  if (passenger.passengerType === "FOREIGN_TOURIST") {
    if (passenger.isPassportVerified && passenger.isFaceVerified) {
      return { label: "Passport & Face Verified", variant: "active" };
    }
    if (passenger.isPassportVerified || passenger.isFaceVerified) {
      return { label: "Partially Verified", variant: "warning" };
    }
    return { label: "Unverified", variant: "danger" };
  }
  if (passenger.isPhoneVerified && passenger.isDocumentVerified) {
    return { label: "Phone & ID Verified", variant: "active" };
  }
  if (passenger.isPhoneVerified) {
    return { label: "Phone Verified", variant: "warning" };
  }
  return { label: "Unverified", variant: "danger" };
}

export function passengerTypeBadge(passenger) {
  const verification = verificationBadge(passenger);
  return { label: `${passengerTypeLabel(passenger.passengerType)} (${verification.label})`, variant: verification.variant };
}

export function isPassengerVerified(passenger) {
  if (passenger.passengerType === "FOREIGN_TOURIST") {
    return !!(passenger.isPassportVerified && passenger.isFaceVerified);
  }
  return !!(passenger.isPhoneVerified && passenger.isDocumentVerified);
}
