import AuthTabs from "@/components/AuthTabs";

// Sign In and Sign Up share one page with two tabs; /signup opens on Sign Up.
export default function SignupPage() {
  return <AuthTabs initial="signup" />;
}
