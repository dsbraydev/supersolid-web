"use client";

import { animate, stagger } from "motion";
import { splitText } from "motion-plus";
import { useEffect, useRef } from "react";

export default function SplitText() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.fonts.ready.then(() => {
      if (!containerRef.current) return;

      containerRef.current.style.visibility = "visible";

      const { words } = splitText(containerRef.current.querySelector("h1")!);

      animate(
        words,
        { opacity: [0, 1], y: [10, 0] },
        {
          type: "spring",
          duration: 3,
          bounce: 0,
          delay: stagger(0.07),
        }
      );
    });
  }, []);

  return (
    <div
      className="flex justify-center items-center w-full max-w-[600px] text-left text-3xl leading-snug font-semibold text-white"
      ref={containerRef}
      style={{ visibility: "hidden" }}
    >
      <h1>
        We’re a creative-owned <br />
        agency that specialises in <br />
        Super x Solid outcomes.
      </h1>
    </div>
  );
}
