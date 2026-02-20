import { redirect } from 'next/navigation';
import { Routes } from '@/routes';

export default function AuthPage() {
  redirect(Routes.AUTH_SIGNIN);
}
