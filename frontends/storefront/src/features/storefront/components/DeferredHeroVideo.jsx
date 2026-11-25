"use client";

import { useEffect, useRef } from "react";

export default function DeferredHeroVideo() {
  const videoRef = useRef(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (document.visibilityState !== "visible") return;
      videoRef.current?.play().catch(() => {});
    }, 1800);
    return () => {
      window.clearTimeout(timer);
      videoRef.current?.pause();
    };
  }, []);

  return (
    <video
      ref={videoRef}
      className="absolute inset-0 z-0 h-full w-full object-cover"
      loop
      muted
      playsInline
      preload="none"
      poster="https://res.cloudinary.com/l8vkwojw/image/upload/v1794229944/acquireauto/project-images/daa9559347688c5310fb882306a593d0.jpg"
      aria-hidden="true"
      tabIndex={-1}
    >
      <source src="/videos/engine-repair.mp4" type="video/mp4" />
    </video>
  );
}
