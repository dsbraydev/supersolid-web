"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import images from "./images"; // List of image URLs

const variants = {
  enter: { y: 50, opacity: 0 },
  center: { y: 0, opacity: 1 },
  exit: { y: -50, opacity: 0 },
};

export default function SmoothCycle() {
  const [index, setIndex] = useState(0);
  const [loaderKey, setLoaderKey] = useState(0);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % images.length);

      setStep((prevStep) => {
        if (prevStep === 4) {
          setLoaderKey((k) => k + 1);
          return 0;
        }
        return prevStep + 1;
      });
    }, 900);

    return () => clearInterval(interval);
  }, [step]);

  return (
    <div style={{ width: 200 }}>
      {/* Image Transition */}
      <div
        style={{
          position: "relative",
          width: "100%",
          height: 100, // <-- Reserve space to prevent jumping
          overflow: "hidden",
        }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.img
            key={`${index}-${loaderKey}`}
            src={images[index]}
            alt={`img-${index}`}
            initial="enter"
            animate="center"
            exit="exit"
            variants={variants}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            style={{
              position: "absolute",
              width: "100%",
              height: "auto",
              top: 0,
              left: 0,
            }}
          />
        </AnimatePresence>
      </div>

      {/* Loader Bar */}
      <div
        style={{
          marginTop: 4,
          width: "100%",
          height: 4,
          backgroundColor: "rgba(255,255,255,0.1)",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <motion.div
          key={loaderKey}
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: 5, ease: "linear" }}
          style={{
            height: "100%",
            backgroundColor: "#fff",
            position: "absolute",
            left: 0,
            top: 0,
          }}
        />
      </div>
    </div>
  );
}
