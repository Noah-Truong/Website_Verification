import { AuthForm } from "@/components/AuthForm";
import { AuthLayout } from "@/components/AuthLayout";

export default function RegisterPage() {
  return (
    <AuthLayout
      title="Create account"
      subtitle="Register as an internal member to start verifying client sites."
    >
      <AuthForm mode="register" />
    </AuthLayout>
  );
}
