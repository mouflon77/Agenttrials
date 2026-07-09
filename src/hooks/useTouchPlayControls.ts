"use client";

import { useEffect, useState } from "react";

/**
 * True on phones/tablets that should use on-screen touch controls.
 * Uses orientation + short edge — NOT max-width alone (landscape phones are ~800px wide).
 */
export function useTouchPlayControls(): boolean {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const evaluate = () => {
      const hasTouch =
        "ontouchstart" in window || navigator.maxTouchPoints > 0;
      if (!hasTouch) {
        setActive(false);
        return;
      }

      const landscape = window.matchMedia("(orientation: landscape)").matches;
      const shortEdge = landscape
        ? window.innerHeight
        : window.innerWidth;

      // Phones in landscape: height ~360–480px. Portrait: width ~360–430px.
      setActive(shortEdge <= 520);
    };

    evaluate();
    window.addEventListener("resize", evaluate);
    window.addEventListener("orientationchange", evaluate);
    return () => {
      window.removeEventListener("resize", evaluate);
      window.removeEventListener("orientationchange", evaluate);
    };
  }, []);

  return active;
}
