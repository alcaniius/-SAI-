'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function AdminSedesRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/admin/organizaciones');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
        <p className="mt-4 text-gray-500">Redirigiendo a Organizaciones...</p>
      </div>
    </div>
  );
}
