"use client";
import { useEffect, useRef } from "react";
import Logo from "../../public/logo.avif";
import initWebGLDistortion from "@/lib/initWebGLDistortion";

export default function DistortedLogo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<
    HTMLImageElement & { dataset: { distortionStrength?: string } }
  >(null);

  useEffect(() => {
    if (!containerRef.current || !canvasRef.current || !imageRef.current) {
      console.warn("Missing container, canvas, or image element");
      return;
    }

    const image = imageRef.current;
    const initializeWebGL = () => {
      console.log(
        "Image loaded:",
        image.naturalWidth,
        "x",
        image.naturalHeight
      );
      const cleanup = initWebGLDistortion({
        container: containerRef.current as HTMLDivElement,
        canvas: canvasRef.current as HTMLCanvasElement,
        image: imageRef.current as HTMLImageElement & {
          dataset: { distortionStrength?: string };
        },
      });
      if (!cleanup) {
        console.error("WebGL initialization failed");
        // Retry initialization after a delay if it fails
        setTimeout(initializeWebGL, 1000);
      } else {
        console.log("WebGL initialized successfully");
      }
      return cleanup;
    };

    const attemptInitialization = () => {
      if (image.complete && image.naturalWidth > 0) {
        return initializeWebGL();
      } else {
        console.log("Image not loaded, waiting for load event");
        const onLoad = () => {
          console.log("Image load event fired");
          const cleanup = initializeWebGL();
          image.removeEventListener("load", onLoad);
          return cleanup;
        };
        image.addEventListener("load", onLoad);
        // Force image reload if it fails to load within 5 seconds
        const timeout = setTimeout(() => {
          console.warn("Image load timeout, forcing reload");
          image.src = Logo.src + "?t=" + new Date().getTime(); // Cache-bust
        }, 5000);
        return () => {
          image.removeEventListener("load", onLoad);
          clearTimeout(timeout);
        };
      }
    };

    return attemptInitialization();
  }, []);

  return (
    <div
      data-webgl-container
      ref={containerRef}
      className="relative"
      style={{
        width: "100vw", // Full viewport width
        maxWidth: "100%", // Respect parent constraints
        margin: "0 auto", // Center horizontally
      }}
    >
      <img
        ref={imageRef}
        src={Logo.src}
        alt="Supersolid Logo"
        id="distorted-image"
        data-distortion-strength="0.08"
        className="hidden"
      />
      <canvas
        ref={canvasRef}
        className="g_canvas_distortion w-full h-auto"
        style={{ display: "block" }}
      />
    </div>
  );
}
