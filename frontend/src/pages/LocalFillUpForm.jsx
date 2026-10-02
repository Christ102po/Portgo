import { SimplePassengerForm } from "../components/SimplePassengerForm";

export default function LocalFillUpForm() {
  return (
    <SimplePassengerForm
      registrationType="LOCAL_PASSENGER"
      title="Local Passenger Fill-Up Form"
      subtitle="Please provide your basic passenger information and select the ship you boarded."
    />
  );
}
