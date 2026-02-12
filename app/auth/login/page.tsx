import { LoginForm } from '@/components/auth/login-form';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin Login - PlayStation Rental',
  description: 'Login to the admin dashboard',
};

export default function LoginPage() {
  return <LoginForm />;
}
