"use client";

import Link from "next/link";
import { motion } from "motion/react";

interface LinkProps {
  href: string;
  title: string;
}

export default function LinkRotation({ title, href }: LinkProps) {
  return (
    <Link
      href={href}
      className="relative inline-block h-[20px] overflow-hidden font-semibold"
    >
      {/* Wrap content in motion.div to detect hover */}
      <motion.div
        className="relative inline-block h-[20px] overflow-hidden"
        initial="rest"
        whileHover="hover"
        animate="rest"
        style={{ cursor: "pointer" }}
      >
        {/* Top text */}
        <motion.span
          className="block"
          variants={{
            rest: { y: "0%", transition: { duration: 0.3 } },
            hover: { y: "-100%", transition: { duration: 0.3 } },
          }}
          style={{ display: "block", transformOrigin: "bottom" }}
        >
          {title}
        </motion.span>

        {/* Bottom text */}
        <motion.span
          className="absolute inset-0 block"
          variants={{
            rest: { y: "100%", transition: { duration: 0.3 } },
            hover: { y: "0%", transition: { duration: 0.3 } },
          }}
          style={{ display: "block", transformOrigin: "top" }}
        >
          {title}
        </motion.span>
      </motion.div>
    </Link>
  );
}
