import { AuthForm } from "@/components/AuthForm";
import { AuthLayout } from "@/components/AuthLayout";

export default function LoginPage() {
  return (
    <AuthLayout
      title="Sign in"
      subtitle="Access the verification console with your Nortiq credentials."
    >
      <AuthForm mode="login" />
    </AuthLayout>
  );
}
