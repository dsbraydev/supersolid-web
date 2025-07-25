"use client";

import { useEffect, useState } from "react";
import Loader from "./Loader";

interface LoaderWrapperProps {
  children: React.ReactNode;
  loaderDuration?: number;
}

export default function LoaderWrapper({
  children,
  loaderDuration = 5000,
}: LoaderWrapperProps) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const hasVisited = sessionStorage.getItem("hasVisitedSite");

    if (hasVisited) {
      setIsLoading(false);
    } else {
      const timer = setTimeout(() => {
        sessionStorage.setItem("hasVisitedSite", "true");
        setIsLoading(false);
      }, loaderDuration);
      return () => clearTimeout(timer);
    }
  }, [loaderDuration]);

  if (isLoading) {
    return <Loader />;
  }

  return <>{children}</>;
}
