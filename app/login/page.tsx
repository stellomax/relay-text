import AuthTabs from "@/components/AuthTabs";

// Sign In and Sign Up share one page with two tabs; /login opens on Sign In.
export default function LoginPage() {
  return <AuthTabs initial="login" />;
}
