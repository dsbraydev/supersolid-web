"use client";

import LoaderWrapper from "@/components/LoaderWrapper";
import ScatterTextMotion from "@/components/ScatterTextMotion";
import dynamic from "next/dynamic";
import Logo from "../../public/supaseries.png";

const LandingCanvas = dynamic(() => import("../components/LandingCanvas"), {
  ssr: false,
});

export default function Home() {
  return (
    <LoaderWrapper loaderDuration={5000}>
      <div className="p-5">
        <ScatterTextMotion />
        <div className="flex justify-center items-center h-full">
          <LandingCanvas imageSrc={Logo.src} />
        </div>
        <div>
          <div className="absolute bottom-5 left-5 bg-white w-2 h-2 rounded-full" />
          <p className="absolute bottom-5 left-1/2 transform -translate-x-1/2 text-white text-sm font-medium">
            Scroll to explore
          </p>
          <div className="absolute bottom-5 right-5 bg-white w-2 h-2 rounded-full" />
        </div>
      </div>
    </LoaderWrapper>
  );
}
