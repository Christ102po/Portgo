const { z } = require("zod");
const { isValidPhMobileNumber, INVALID_PH_PREFIX_MESSAGE } = require("./lib/phPrefixes");

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const otpSendSchema = z.object({
  phone: z.string().min(4),
  channel: z.enum(["sms", "email"]).optional(),
}).superRefine((data, ctx) => {
  if (data.channel === "email") {
    if (!z.string().email().safeParse(data.phone).success) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Enter a valid email address.", path: ["phone"] });
    }
  } else if (!isValidPhMobileNumber(data.phone)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: INVALID_PH_PREFIX_MESSAGE, path: ["phone"] });
  }
});

const otpVerifySchema = z.object({
  phone: z.string().min(4),
  code: z.string().regex(/^\d{6}$/, "Verification code must be exactly 6 digits"),
});

const PASSENGER_TYPE_VALUES = ["LOCAL_RESIDENT", "LOCAL_TOURIST", "FOREIGN_TOURIST"];
const VERIFICATION_DOCUMENT_TYPE_VALUES = ["VALID_ID", "STUDENT_ID", "BARANGAY_CLEARANCE", "PASSPORT"];

const familyMemberSchema = z.object({
  fullName: z.string().min(1),
  age: z.coerce.number().int().min(0).max(130).optional().nullable(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  isSeniorCitizen: z.boolean().optional(),
  isPWD: z.boolean().optional(),
  isPregnant: z.boolean().optional(),
  needsWheelchair: z.boolean().optional(),
  isStudent: z.boolean().optional(),
  isInfant: z.boolean().optional(),
  isMedicalEmergency: z.boolean().optional(),
});

const passengerCreateSchema = z.object({
  fullName: z.string().min(1),
  contactNumber: z.string().min(7).optional().nullable(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional().nullable(),
  address: z.string().min(1).optional().nullable(),
  passengerType: z.enum(PASSENGER_TYPE_VALUES),
  passportNumber: z.string().optional().nullable(),
  nationality: z.string().optional().nullable(),
  age: z.coerce.number().int().min(0).max(130).optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  isEmailVerified: z.boolean().optional(),
  emergencyContactName: z.string().optional().nullable(),
  emergencyContactPhone: z.string().optional().nullable(),
  isPassportVerified: z.boolean().optional(),
  isFaceVerified: z.boolean().optional(),
  faceMatchScore: z.coerce.number().min(0).max(100).optional().nullable(),
  selfiePhotoUrl: z.string().optional().nullable(),
  idNumber: z.string().optional().nullable(),
  verificationDocumentType: z.enum(VERIFICATION_DOCUMENT_TYPE_VALUES).optional().nullable(),
  verificationDocumentUrl: z.string().optional().nullable(),
  isDocumentVerified: z.boolean().optional(),
  transactionType: z.enum(["SIGN_IN", "SIGN_OUT"]),
  purpose: z.enum(["TOURISM", "BUSINESS", "RESIDENT_RETURN", "CARGO", "MEDICAL", "EDUCATION", "OTHER"]).optional(),
  shipId: z.string().min(1),
  scheduleId: z.string().min(1),
  isSeniorCitizen: z.boolean().optional(),
  isPWD: z.boolean().optional(),
  isPregnant: z.boolean().optional(),
  needsWheelchair: z.boolean().optional(),
  isStudent: z.boolean().optional(),
  isInfant: z.boolean().optional(),
  isMedicalEmergency: z.boolean().optional(),
  hasVehicle: z.boolean().optional(),
  vehicleType: z.enum(["MOTORCYCLE", "SEDAN_SUV", "TRUCK_CARGO"]).optional().nullable(),
  plateNumber: z.string().optional().nullable(),
  ticketSerialNumber: z.string().optional().nullable(),
  ticketVesselName: z.string().optional().nullable(),
  ticketTravelDate: z.string().optional().nullable(),
  ticketVerified: z.boolean().optional(),
  ticketPhotoUrl: z.string().optional().nullable(),
  accommodationClass: z.enum(["ECONOMY", "TOURIST_AIRCON", "BUSINESS"]),
  members: z.array(familyMemberSchema).max(20).optional().default([]),
}).superRefine((data, ctx) => {
  if (data.passengerType !== "FOREIGN_TOURIST" && data.contactNumber && !isValidPhMobileNumber(data.contactNumber)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: INVALID_PH_PREFIX_MESSAGE, path: ["contactNumber"] });
  }
});

const familyBookingCreateSchema = z.object({
  headContact: z.string().min(7).optional().nullable().or(z.literal("")),
  headEmail: z.string().email().optional().nullable().or(z.literal("")),
  verificationIdentifier: z.string().min(4),
  verificationChannel: z.enum(["sms", "email"]),
  phoneVerificationToken: z.string().min(1, "Contact verification is required"),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  address: z.string().min(1),
  passengerType: z.enum(PASSENGER_TYPE_VALUES),
  passportNumber: z.string().optional().nullable(),
  idNumber: z.string().optional().nullable(),
  verificationDocumentType: z.enum(VERIFICATION_DOCUMENT_TYPE_VALUES).optional().nullable(),
  verificationDocumentUrl: z.string().optional().nullable(),
  transactionType: z.enum(["SIGN_IN", "SIGN_OUT"]),
  purpose: z.enum(["TOURISM", "BUSINESS", "RESIDENT_RETURN", "CARGO", "MEDICAL", "EDUCATION", "OTHER"]).optional(),
  shipId: z.string().min(1),
  scheduleId: z.string().min(1),
  accommodationClass: z.enum(["ECONOMY", "TOURIST_AIRCON", "BUSINESS"]),
  members: z.array(familyMemberSchema).min(2),
}).superRefine((data, ctx) => {
  if (data.verificationChannel === "sms") {
    if (!data.headContact || !isValidPhMobileNumber(data.headContact)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: INVALID_PH_PREFIX_MESSAGE, path: ["headContact"] });
    }
    if (data.verificationIdentifier !== data.headContact) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Verified phone number does not match the primary contact.", path: ["verificationIdentifier"] });
    }
  } else {
    if (!data.headEmail || !z.string().email().safeParse(data.headEmail).success) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "A valid verified email address is required.", path: ["headEmail"] });
    }
    if (String(data.verificationIdentifier || "").trim().toLowerCase() !== String(data.headEmail || "").trim().toLowerCase()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Verified email does not match the primary contact email.", path: ["verificationIdentifier"] });
    }
  }
});

const accommodationClassConfigSchema = z.object({
  className: z.enum(["ECONOMY", "TOURIST_AIRCON", "BUSINESS"]),
  capacity: z.coerce.number().int().min(0),
});

const shipCreateSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  capacity: z.coerce.number().int().min(1).optional(),
  classes: z.array(accommodationClassConfigSchema).optional(),
});

const shipUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().min(1).optional(),
  capacity: z.coerce.number().int().min(1).optional(),
  active: z.boolean().optional(),
  classes: z.array(accommodationClassConfigSchema).optional(),
});

const shipClassesUpdateSchema = z.object({
  classes: z.array(accommodationClassConfigSchema),
});

const scheduleCreateSchema = z.object({
  route: z.enum(["SURIGAO_TO_DAPA", "DAPA_TO_SURIGAO"]),
  departureTime: z.string().min(1),
  daysOfWeek: z.string().min(1),
  shipId: z.string().min(1),
  voyageNumber: z.string().optional().nullable(),
  gateNumber: z.string().optional().nullable(),
  active: z.boolean().optional(),
});

const scheduleUpdateSchema = z.object({
  route: z.enum(["SURIGAO_TO_DAPA", "DAPA_TO_SURIGAO"]).optional(),
  departureTime: z.string().min(1).optional(),
  daysOfWeek: z.string().min(1).optional(),
  shipId: z.string().min(1).optional(),
  voyageNumber: z.string().optional().nullable(),
  gateNumber: z.string().optional().nullable(),
  active: z.boolean().optional(),
});

const scheduleDelaySchema = z.object({
  minutes: z.coerce.number().int().min(1).max(1440),
  reason: z.string().min(1),
});

const scheduleMaintenanceSchema = z.object({
  reason: z.string().optional().nullable(),
});

const tripStatusUpdateSchema = z.object({
  status: z.enum(["BOARDED", "CANCELLED", "NO_SHOW", "ACTIVE"]),
  reason: z.string().optional().nullable(),
});

const tripRebookSchema = z.object({
  scheduleId: z.string().min(1),
});

const scheduleCancelSchema = z.object({
  category: z.enum(["CANCELLED_WEATHER", "CANCELLED_MAINTENANCE"]),
  reason: z.string().min(1),
});

const checkinScanSchema = z.object({
  passNumber: z.string().min(1),
});

const advisoryUpdateSchema = z.object({
  active: z.boolean().optional(),
  message: z.string().optional().nullable(),
  suspended: z.boolean().optional(),
  suspendedReason: z.string().optional().nullable(),
});

const advisoryCancelAllSchema = z.object({
  reason: z.string().min(1),
});

const bookingLookupSchema = z.object({
  query: z.string().min(4),
});

const barangaySearchSchema = z.object({
  query: z.string().min(1),
});

const barangayImportSchema = z.object({
  csvText: z.string().min(1),
});

const passengerSearchSchema = z.object({
  query: z.string().min(3),
});

const passengerRebookSchema = z.object({
  transactionType: z.enum(["SIGN_IN", "SIGN_OUT"]),
  purpose: z.enum(["TOURISM", "BUSINESS", "RESIDENT_RETURN", "CARGO", "MEDICAL", "EDUCATION", "OTHER"]).optional(),
  shipId: z.string().min(1),
  scheduleId: z.string().min(1),
  accommodationClass: z.enum(["ECONOMY", "TOURIST_AIRCON", "BUSINESS"]),
  hasVehicle: z.boolean().optional(),
  vehicleType: z.enum(["MOTORCYCLE", "SEDAN_SUV", "TRUCK_CARGO"]).optional().nullable(),
  plateNumber: z.string().optional().nullable(),
});

const reportsQuerySchema = z.object({
  range: z.enum(["today", "week", "month", "year", "custom"]).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  shipId: z.string().optional(),
  route: z.enum(["SURIGAO_TO_DAPA", "DAPA_TO_SURIGAO"]).optional(),
});

const adminCreateSchema = z.object({
  fullName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["SUPER_ADMIN", "ADMIN", "TICKETING_OFFICER", "GATE_SCANNER"]),
});

const adminUpdateSchema = z.object({
  fullName: z.string().min(1).optional(),
  role: z.enum(["SUPER_ADMIN", "ADMIN", "TICKETING_OFFICER", "GATE_SCANNER"]).optional(),
  active: z.boolean().optional(),
});

const adminResetPasswordSchema = z.object({
  password: z.string().min(8),
});

const watchlistCreateSchema = z.object({
  fullName: z.string().min(1),
  passportNumber: z.string().optional().nullable(),
  contactNumber: z.string().optional().nullable(),
  reason: z.string().min(1),
});

const watchlistUpdateSchema = z.object({
  fullName: z.string().min(1).optional(),
  passportNumber: z.string().optional().nullable(),
  contactNumber: z.string().optional().nullable(),
  reason: z.string().min(1).optional(),
  active: z.boolean().optional(),
});

const manifestSignOffSchema = z.object({
  officerName: z.string().min(1),
  badgeNumber: z.string().min(1),
  signatureDataUrl: z.string().min(1),
});

module.exports = {
  loginSchema,
  otpSendSchema,
  otpVerifySchema,
  passengerCreateSchema,
  passengerSearchSchema,
  passengerRebookSchema,
  familyBookingCreateSchema,
  shipCreateSchema,
  shipUpdateSchema,
  shipClassesUpdateSchema,
  scheduleCreateSchema,
  scheduleUpdateSchema,
  scheduleDelaySchema,
  scheduleMaintenanceSchema,
  tripStatusUpdateSchema,
  tripRebookSchema,
  scheduleCancelSchema,
  checkinScanSchema,
  advisoryUpdateSchema,
  advisoryCancelAllSchema,
  bookingLookupSchema,
  barangaySearchSchema,
  barangayImportSchema,
  reportsQuerySchema,
  adminCreateSchema,
  adminUpdateSchema,
  adminResetPasswordSchema,
  watchlistCreateSchema,
  watchlistUpdateSchema,
  manifestSignOffSchema,
};
