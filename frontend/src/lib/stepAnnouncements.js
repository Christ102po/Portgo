const LOCAL_ANNOUNCEMENTS = {
  1: "Choose whether the primary passenger is a local resident or a tourist.",
  2: "Please choose your trip direction: outbound if you're departing, or inbound if you're arriving.",
  3: "Enter a mobile number or email address. The verification code is sent automatically when the contact information is complete.",
  4: "Enter the primary passenger details. You may optionally add accompanying members on this step.",
  5: "Please select your ship and departure schedule, then choose your accommodation class.",
  6: "Please review all passenger and trip details, then generate the digital pass to finish.",
};

const TOURIST_ANNOUNCEMENTS = {
  ...LOCAL_ANNOUNCEMENTS,
  3: "Please take a selfie so we can verify the primary passenger's identity.",
  4: "Enter the primary passenger's name, nationality, and passport number. You may optionally add accompanying members on this step.",
};

export function getStepAnnouncement({ step, passengerType }) {
  if (passengerType === "FOREIGN_TOURIST") return TOURIST_ANNOUNCEMENTS[step] || "";
  return LOCAL_ANNOUNCEMENTS[step] || "";
}

export const SUCCESS_ANNOUNCEMENT =
  "Registration complete. Keep the primary passenger's digital pass for boarding. If accompanying members were added, the same QR covers the whole registered group.";
