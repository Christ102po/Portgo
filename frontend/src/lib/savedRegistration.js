const KEY = "portgo_saved_registration_v1";

export function getSavedRegistration() {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveIndividualRegistration(result) {
  if (!result || result.offline || !result.qrCodeDataUrl || !result.passNumber || !result.passenger) return;
  const saved = {
    kind: "individual",
    code: result.passNumber,
    qrCodeDataUrl: result.qrCodeDataUrl,
    passenger: {
      id: result.passenger.id,
      fullName: result.passenger.fullName,
      passengerType: result.passenger.passengerType,
      age: result.passenger.age ?? null,
      gender: result.passenger.gender ?? null,
    },
    savedAt: new Date().toISOString(),
  };
  window.localStorage.setItem(KEY, JSON.stringify(saved));
}

export function saveFamilyRegistration(result) {
  if (!result || result.offline || !result.masterQrCodeDataUrl || !result.masterCode || !result.familyBooking) return;
  const saved = {
    kind: "family",
    code: result.masterCode,
    qrCodeDataUrl: result.masterQrCodeDataUrl,
    headFullName: result.familyBooking.headFullName,
    memberCount: result.familyBooking.memberCount,
    passengers: (result.trips || []).map((trip, index) => ({
      id: trip.passenger?.id || trip.passengerId || String(index),
      fullName: trip.passenger?.fullName || `Member ${index + 1}`,
      passengerType: trip.passenger?.passengerType || null,
      role: index === 0 ? "LEADER" : "MEMBER",
    })),
    savedAt: new Date().toISOString(),
  };
  window.localStorage.setItem(KEY, JSON.stringify(saved));
}
