import { RegisterForm } from '@/components/auth/register-form';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Create Admin Account - PlayStation Rental',
  description: 'Create a new admin account for the PlayStation rental system',
};

export default function RegisterPage() {
  return <RegisterForm />;
}
