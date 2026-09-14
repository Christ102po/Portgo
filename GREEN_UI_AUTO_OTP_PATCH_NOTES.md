# PORTGO Green UI + Automatic OTP Update

## What changed

- SMS OTP now sends automatically when a complete valid Philippine mobile number is entered.
- The visible **Send OTP / Send Code** button was removed from the phone-number flow.
- Automatic OTP is enabled for both individual registration and group/dependent registration.
- After an OTP is sent, the OTP dialog opens automatically. If it is closed, the user can tap the "code sent" status to reopen it without sending a second SMS.
- Resend remains available inside the OTP dialog after the cooldown.
- Departing/Arriving cards no longer show the word **Selected**. The active choice is shown with a check icon and green highlight instead.
- The passenger-registration wizard was redesigned with a responsive green travel-booking style inspired by the supplied reference image.
- The new layout is mobile-first but expands cleanly for tablets, laptops, and desktop screens.
- Updated styling includes the PORTGO header, progress indicator, passenger-type cards, direction cards, OTP UI, group registration, trip selection, confirmation cards, and responsive action controls.

## Main files changed

- `frontend/src/components/wizard/KioskTerminalHeader.jsx`
- `frontend/src/components/wizard/OtpModal.jsx`
- `frontend/src/components/wizard/StepConfirmation.jsx`
- `frontend/src/components/wizard/StepGroupConfirmation.jsx`
- `frontend/src/components/wizard/StepGroupMembers.jsx`
- `frontend/src/components/wizard/StepIndicator.jsx`
- `frontend/src/components/wizard/StepPassengerType.jsx`
- `frontend/src/components/wizard/StepPhoneVerification.jsx`
- `frontend/src/components/wizard/StepTransactionType.jsx`
- `frontend/src/components/wizard/StepTripDetails.jsx`
- `frontend/src/components/wizard/WizardShell.jsx`
- `frontend/src/pages/KioskPage.jsx`
- `frontend/src/styles/index.css`

## Railway

The existing Railway build command (`npm run build`) will regenerate `frontend/dist` from these updated source files during deployment.
