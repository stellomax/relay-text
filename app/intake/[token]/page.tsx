"use client";

import { useParams } from "next/navigation";
import IntakeForm from "@/components/IntakeForm";

// A district's private onboarding form: relaytext.io/intake/<link>.
export default function IntakePage() {
  const { token } = useParams<{ token: string }>();
  return <IntakeForm token={token} />;
}
