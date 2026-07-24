"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AppearancePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/settings?tab=appearance");
  }, [router]);

  return (
    <div className="p-8 text-center text-muted-foreground text-xs font-medium">
      Redirecionando para as Configurações de Aparência...
    </div>
  );
}
