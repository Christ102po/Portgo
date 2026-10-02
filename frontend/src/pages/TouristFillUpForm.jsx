import { SimplePassengerForm } from "../components/SimplePassengerForm";

export default function TouristFillUpForm() {
  return (
    <SimplePassengerForm
      registrationType="TOURIST"
      title="Tourist Fill-Up Form"
      subtitle="Please provide your basic passenger information and select the ship you boarded."
    />
  );
}
