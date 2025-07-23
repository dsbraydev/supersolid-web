"use client";
import dynamic from "next/dynamic";

const DistortedLogo = dynamic(() => import("../components/DistortedLogo"), {
  ssr: false,
});

export default function Home() {
  return (
    <div style={{ padding: "50px", textAlign: "center" }}>
      <DistortedLogo />
    </div>
  );
}
