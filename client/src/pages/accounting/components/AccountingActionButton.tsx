import type { ButtonHTMLAttributes } from 'react';
import { useAuth } from '../../../contexts/AuthContext';

export function AccountingActionButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  const { can } = useAuth();
  if (!can('accounting.manage')) return null;
  return <button {...props} />;
}
