"use client";

import Link from "next/link";
import { motion, useAnimation } from "motion/react";
import { useState } from "react";
import { ArrowUpRight } from "lucide-react";

interface LinkProps {
  href: string;
  title: string;
}

export default function LinkRotation({ title, href }: LinkProps) {
  const [hovered, setHovered] = useState(false);

  // Controls for text
  const topTextControls = useAnimation();
  const bottomTextControls = useAnimation();

  // Controls for arrows
  const arrowTopControls = useAnimation();
  const arrowBottomControls = useAnimation();

  const onHoverStart = () => {
    setHovered(true);

    // Text animations
    topTextControls.start({
      y: "-100%",
      transition: { duration: 0.3 },
      opacity: 0,
    });
    bottomTextControls.start({
      y: "0%",
      transition: { duration: 0.3 },
      opacity: 1,
    });

    // Arrow animations
    arrowTopControls.start({
      x: 8, // was 16
      y: -8, // was -16
      opacity: 0,
      transition: { duration: 0.3 },
    });
    arrowBottomControls.start({
      x: 0,
      y: 0,
      opacity: 1,
      transition: { duration: 0.3 },
    });
  };

  const onHoverEnd = () => {
    setHovered(false);

    // Text animations reset
    topTextControls.start({
      y: "0%",
      transition: { duration: 0.3 },
      opacity: 1,
    });
    bottomTextControls.start({
      y: "100%",
      transition: { duration: 0.3 },
      opacity: 0,
    });

    // Arrow animations reset
    arrowTopControls.start({
      x: 0,
      y: 0,
      opacity: 1,
      transition: { duration: 0.3 },
    });
    arrowBottomControls.start({
      x: -8, // was -16
      y: 8, // was 16
      opacity: 0,
      transition: { duration: 0.3 },
    });
  };

  return (
    <Link
      href={href}
      className="inline-flex items-center group h-[20px] overflow-visible font-semibold cursor-pointer"
      onMouseEnter={onHoverStart}
      onMouseLeave={onHoverEnd}
    >
      {/* Text wrapper */}
      <span className="relative inline-block overflow-hidden h-[20px] leading-[20px]">
        {/* Top text */}
        <motion.span
          animate={topTextControls}
          initial={{ y: "0%", opacity: 1 }} // visible initially
          style={{ display: "block", transformOrigin: "bottom" }}
        >
          {title}
        </motion.span>

        <motion.span
          animate={bottomTextControls}
          initial={{ y: "100%", opacity: 0 }} // hidden initially
          style={{
            position: "absolute",
            inset: 0,
            display: "block",
            transformOrigin: "top",
          }}
        >
          {title}
        </motion.span>
      </span>

      {/* Arrow container */}
      <span className="relative ml-2 w-[16px] h-[16px] overflow-visible">
        {/* Top arrow */}
        <motion.span
          className="absolute inset-0"
          animate={arrowTopControls}
          initial={{ x: 0, y: 0, opacity: 1 }}
          style={{ originX: 0, originY: 1 }}
        >
          <ArrowUpRight size={16} />
        </motion.span>

        {/* Bottom arrow */}
        <motion.span
          className="absolute inset-0"
          animate={arrowBottomControls}
          initial={{ x: -12, y: 16, opacity: 0 }}
          style={{ originX: 0, originY: 1 }}
        >
          <ArrowUpRight size={16} />
        </motion.span>
      </span>
    </Link>
  );
}
