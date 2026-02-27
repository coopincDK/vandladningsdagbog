"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";

export default function Home() {
  const router = useRouter();
  const profile = useStore((s) => s.profile);
  useEffect(() => {
    router.replace(profile ? "/registrer" : "/profil");
  }, [profile, router]);
  return null;
}
