"use client";
import dynamic from "next/dynamic";

const DistortedLogo = dynamic(() => import("../components/DistortedLogo"), {
  ssr: false,
});

export default function Home() {
  return (
    <div className="flex justify-center items-center h-screen px-16">
      <DistortedLogo />
    </div>
  );
}
