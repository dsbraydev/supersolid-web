"use client";
import Logo from "../../../../public/logo.avif"; // app/page.js
import dynamic from "next/dynamic";
const LandingCanvas = dynamic(
  () => import("../../../components/LandingCanvas"),
  {
    ssr: false,
  }
);
export default function Home() {
  return (
    <div>
      <LandingCanvas imageSrc={Logo.src} />;
    </div>
  );
}
