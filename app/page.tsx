"use client";
import { useStore } from "@/lib/store";
import ProfilPage from "./profil/page";
import RegistrerPage from "./registrer/page";

export default function Home() {
  const profile = useStore((s) => s.profile);
  return profile ? <RegistrerPage /> : <ProfilPage />;
}
