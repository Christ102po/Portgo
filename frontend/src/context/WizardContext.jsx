import { createContext, useReducer } from "react";

export const TOTAL_STEPS = 6;

const initialState = {
  step: 1,
  registrationMode: "INDIVIDUAL",
  passengerType: null,
  transactionType: null,

  // Local flow
  phone: "",
  isPhoneVerified: false,
  groupPhoneVerificationToken: "",
  groupVerificationIdentifier: "",
  groupVerificationChannel: "sms",
  contactVerificationIdentifier: "",
  contactVerificationChannel: "sms",
  contactVerificationToken: "",
  fullName: "",
  gender: null,
  age: "",
  address: "",
  emergencyContactName: "",
  emergencyContactPhone: "",

  // Optional ID reference (non-tourist flows) — manually entered, no scan/OCR
  idNumber: "",
  verificationDocumentType: null,
  verificationDocumentUrl: null,
  isDocumentVerified: false,
  // Set true only when the Full Name autocomplete matched a Barangay
  // Resident Masterlist record and the passenger selected it — cleared the
  // moment they edit the name away from that match.
  isBarangayVerified: false,

  // Tourist flow
  passportNumber: "",
  nationality: "",
  isPassportVerified: false,
  selfiePhotoUrl: null,
  isFaceVerified: false,
  faceMatchScore: null,
  touristPhone: "",
  touristPhoneCountryCode: "+63",

  // Priority / passenger classification
  isSeniorCitizen: false,
  isPWD: false,
  isPregnant: false,
  needsWheelchair: false,
  isStudent: false,
  isInfant: false,
  isMedicalEmergency: false,

  // Shared contact
  email: "",
  isEmailVerified: false,

  // Trip
  shipId: null,
  scheduleId: null,
  accommodationClass: null,

  // Ticket upload & verification
  ticketPhotoUrl: null,
  ticketSerialNumber: "",
  ticketVesselName: "",
  ticketTravelDate: "",
  ticketVerified: false,
  ticketIssue: "",
  ticketSkipped: false,

  // Group / family registration
  groupMembers: [],

  result: null,
  isOfflinePending: false,
};

function wizardReducer(state, action) {
  switch (action.type) {
    case "SET_FIELD": {
      const next = { ...state, [action.field]: action.value };
      if (action.field === "phone" && action.value !== state.phone) {
        next.isPhoneVerified = false;
        next.groupPhoneVerificationToken = "";
        next.groupVerificationIdentifier = "";
      }
      if (action.field === "email" && action.value !== state.email) {
        next.isEmailVerified = false;
        if (state.contactVerificationChannel === "email") {
          next.isPhoneVerified = false;
          next.contactVerificationIdentifier = "";
          next.contactVerificationToken = "";
        }
        if (state.groupVerificationChannel === "email") {
          next.groupPhoneVerificationToken = "";
          next.groupVerificationIdentifier = "";
        }
      }
      return next;
    }
    case "SET_FIELDS":
      return { ...state, ...action.fields };
    case "NEXT_STEP":
      return { ...state, step: Math.min(TOTAL_STEPS, state.step + 1) };
    case "PREV_STEP":
      return { ...state, step: Math.max(1, state.step - 1) };
    case "GOTO_STEP":
      return { ...state, step: action.step };
    case "SET_RESULT":
      return { ...state, result: action.result };
    case "RESET":
      return { ...initialState };
    default:
      return state;
  }
}

export const WizardContext = createContext(null);

export function WizardProvider({ children }) {
  const [state, dispatch] = useReducer(wizardReducer, initialState);
  return (
    <WizardContext.Provider value={{ state, dispatch }}>
      {children}
    </WizardContext.Provider>
  );
}
