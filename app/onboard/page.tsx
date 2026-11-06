import IntakeForm from "@/components/IntakeForm";

// Temporary preview of the district onboarding form: the same fields as relaytext.io/intake/<link>,
// but nothing is saved or sent. Remove once the field list is confirmed.
export const metadata = { title: "District onboarding (preview)", robots: { index: false, follow: false } };

export default function OnboardPreview() {
  return <IntakeForm />;
}
