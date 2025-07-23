"use client";
import dynamic from "next/dynamic";

const DistortedLogo = dynamic(() => import("../components/DistortedLogo"), {
  ssr: false,
});

export default function Home() {
  return (
    <div className="flex justify-center items-center h-[calc(100vh-200px)] px-16">
      <DistortedLogo />
    </div>
  );
}
