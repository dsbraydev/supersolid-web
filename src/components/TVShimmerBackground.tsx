"use client";

import { useEffect, useRef } from "react";

export default function TVShimmerBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    const draw = () => {
      const imageData = ctx.createImageData(canvas.width, canvas.height);
      const buffer = new Uint32Array(imageData.data.buffer);

      for (let i = 0; i < buffer.length; i++) {
        // Reduce brightness range by 50%
        const baseGray = (50 + Math.random() * 100) * 0.6; // was 50 to 150, now ~25 to 75

        // Reduce color intensity by 50%
        const r = baseGray * 0.8 * 0.6; // previously baseGray * 0.8
        const g = baseGray * 0.85 * 0.6; // previously baseGray * 0.85
        const b = baseGray * 1 * 0.5; // previously baseGray * 1

        buffer[i] =
          (255 << 24) | ((r & 0xff) << 16) | ((g & 0xff) << 8) | (b & 0xff);
      }

      ctx.putImageData(imageData, 0, 0);
    };

    let animationId: number;
    const loop = () => {
      draw();
      animationId = requestAnimationFrame(loop);
    };

    loop();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resizeCanvas);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed top-0 left-0 w-full h-full z-[-1] pointer-events-none"
    />
  );
}
