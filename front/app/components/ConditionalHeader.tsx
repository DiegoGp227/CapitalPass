"use client";

import { usePathname } from "next/navigation";
import Header from "../dashboard/components/orgamins/Header";

export default function ConditionalHeader() {
  const pathname = usePathname();

  // No mostrar el header en la página de auth
  if (pathname === "/auth") {
    return null;
  }

  return <Header />;
}
