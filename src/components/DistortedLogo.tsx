"use client";
import { useEffect, useRef } from "react";
import Logo from "../../public/logo.avif";
import initWebGLDistortion from "@/lib/initWebGLDistortion";

export default function DistortedLogo() {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const imageRef = useRef(null);

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
        container: containerRef.current,
        canvas: canvasRef.current,
        image: imageRef.current,
      });
      if (!cleanup) {
        console.error("WebGL initialization failed");
      } else {
        console.log("WebGL initialized successfully");
      }
      return cleanup;
    };

    if (image.complete && image.naturalWidth > 0) {
      return initializeWebGL();
    } else {
      const onLoad = () => initializeWebGL();
      image.addEventListener("load", onLoad);
      return () => image.removeEventListener("load", onLoad);
    }
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
