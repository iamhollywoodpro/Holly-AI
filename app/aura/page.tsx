import { redirect } from 'next/navigation';

// /aura → /aura-lab (AURA A&R Workspace)
export default function AuraPage() {
  redirect('/aura-lab');
}
