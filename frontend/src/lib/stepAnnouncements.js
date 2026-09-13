const LOCAL_ANNOUNCEMENTS = {
  1: "Are you a local resident or a tourist? Please tap your answer on the screen, or enter your phone number if you've registered before.",
  2: "Please choose your trip direction: outbound if you're departing, or inbound if you're arriving.",
  3: "Please enter your phone number, then tap Send Code to receive your six digit verification code.",
  4: "Please enter your full name, gender, age, and address.",
  5: "Please select your ship and departure schedule, then choose your accommodation class.",
  6: "Please review your details, then tap Generate Digital Pass to finish.",
};

const TOURIST_ANNOUNCEMENTS = {
  ...LOCAL_ANNOUNCEMENTS,
  3: "Please take a selfie so we can verify your identity.",
  4: "Please enter your full name, nationality, and passport number.",
};

const GROUP_ANNOUNCEMENTS = {
  1: "Are you registering yourself or a group? Please tap your answer on the screen.",
  2: "Please choose your trip direction: outbound if the group is departing, or inbound if the group is arriving.",
  3: "Please add the names and details of everyone traveling in your group.",
  4: "Please select your ship and departure schedule for the group.",
  5: "Please review your group's details, then tap Confirm to finish.",
};

export function getStepAnnouncement({ step, passengerType, isGroupMode }) {
  if (isGroupMode) return GROUP_ANNOUNCEMENTS[step] || "";
  if (passengerType === "FOREIGN_TOURIST") return TOURIST_ANNOUNCEMENTS[step] || "";
  return LOCAL_ANNOUNCEMENTS[step] || "";
}

export const SUCCESS_ANNOUNCEMENT =
  "Registration complete. Please keep your digital pass for boarding, and show it to port staff at the gate.";
