"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { ZoomIn } from "lucide-react";

// Magnification of the side panel (Amazon shows roughly 2x-2.5x).
const ZOOM_LEVEL = 2.4;
// The lens box covers exactly the area that the panel magnifies.
const LENS_SIZE = 100 / ZOOM_LEVEL;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export default function ProductImageZoom({ items, alt }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [zoom, setZoom] = useState({ active: false, x: 50, y: 50 });
  const [portalTarget, setPortalTarget] = useState(null);

  const selectedItem = items[selectedIndex];
  const isImage = selectedItem?.type === "image";

  useEffect(() => {
    setPortalTarget(document.getElementById("product-zoom-portal"));
  }, []);

  // Lens box position stays inside the image, exactly like Amazon's hover box.
  const lensLeft = clamp(zoom.x - LENS_SIZE / 2, 0, 100 - LENS_SIZE);
  const lensTop = clamp(zoom.y - LENS_SIZE / 2, 0, 100 - LENS_SIZE);
  const originX = lensLeft + LENS_SIZE / 2;
  const originY = lensTop + LENS_SIZE / 2;

  function handleMove(event) {
    const bounds = event.currentTarget.getBoundingClientRect();
    setZoom({
      active: true,
      x: clamp(((event.clientX - bounds.left) / bounds.width) * 100, 0, 100),
      y: clamp(((event.clientY - bounds.top) / bounds.height) * 100, 0, 100),
    });
  }

  function resetZoom() {
    setZoom({ active: false, x: 50, y: 50 });
  }

  function selectItem(index) {
    setSelectedIndex(index);
    resetZoom();
  }

  const zoomPanel =
    isImage &&
    zoom.active &&
    portalTarget &&
    createPortal(
      <div
        aria-hidden="true"
        className="relative h-full w-full overflow-hidden border border-[#d5d9d9] bg-white shadow-[0_4px_20px_rgba(0,0,0,.15)]"
      >
        <Image
          src={selectedItem.src}
          alt=""
          fill
          unoptimized
          sizes="1000px"
          className="object-contain"
          style={{
            transform: `scale(${ZOOM_LEVEL})`,
            transformOrigin: `${originX}% ${originY}%`,
          }}
          draggable={false}
        />
      </div>,
      portalTarget,
    );

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-[64px_minmax(0,1fr)] lg:gap-4">
      <div
        aria-label="Product media thumbnails"
        className="order-2 flex gap-2 overflow-x-auto pb-1 lg:order-1 lg:max-h-[520px] lg:flex-col lg:overflow-x-hidden lg:overflow-y-auto lg:pb-0"
        role="group"
      >
        {items.map((item, index) => (
          <button
            key={`${item.type}-${item.src}-${index}`}
            type="button"
            aria-label={
              item.type === "video"
                ? `Play product video ${index + 1}`
                : `Show product image ${index + 1}`
            }
            aria-pressed={selectedIndex === index}
            onClick={() => selectItem(index)}
            onMouseEnter={() => selectItem(index)}
            className={`relative aspect-square w-14 shrink-0 overflow-hidden rounded-md border bg-white transition lg:w-full ${
              selectedIndex === index
                ? "border-[#ff663b] shadow-[0_0_0_3px_rgba(255,102,59,.18)]"
                : "border-[#e2e3e1] hover:border-[#ff663b]"
            }`}
          >
            {item.type === "video" ? (
              <>
                {item.poster ? (
                  <Image
                    src={item.poster}
                    alt=""
                    fill
                    unoptimized
                    sizes="64px"
                    className="object-contain p-1"
                  />
                ) : (
                  <span className="absolute inset-0 grid place-items-center bg-[#f7f7f5] text-[#777a73]">
                    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-current">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </span>
                )}
                <span className="absolute inset-x-0 bottom-0 bg-black/70 py-0.5 text-center text-[8px] font-bold uppercase tracking-wide text-white">
                  Video
                </span>
              </>
            ) : (
              <Image
                src={item.src}
                alt=""
                fill
                unoptimized
                sizes="64px"
                className="object-contain p-1"
              />
            )}
          </button>
        ))}
      </div>

      <div className="order-1 min-w-0 lg:order-2">
        <div className="relative">
          <div
            className={`relative grid aspect-square place-items-center overflow-hidden rounded-lg border border-[#e2e3e1] bg-white ${
              isImage ? "cursor-zoom-in" : ""
            }`}
            aria-label={
              !selectedItem
                ? "No product image is available."
                : isImage
                  ? "Product image. Move the pointer over the image to zoom in."
                  : "Product video player"
            }
            onPointerMove={isImage ? handleMove : undefined}
            onPointerLeave={resetZoom}
          >
            {!selectedItem ? (
              <span className="text-sm text-[#777a73]">No product image available</span>
            ) : selectedItem.type === "video" ? (
              <video
                key={selectedItem.src}
                className="h-full w-full bg-black object-contain"
                controls
                playsInline
                preload="metadata"
                poster={selectedItem.poster}
              >
                <source src={selectedItem.src} />
                Your browser does not support video playback.
              </video>
            ) : (
              <Image
                src={selectedItem.src}
                alt={selectedItem.alt || alt}
                fill
                priority
                unoptimized
                sizes="(min-width: 1024px) 42vw, 90vw"
                className="object-contain"
                draggable={false}
              />
            )}

            {/* Amazon-style hover box (lens) drawn over the image. */}
            {isImage && zoom.active && (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute hidden border border-[#20221f]/35 bg-white/30 lg:block"
                style={{
                  left: `${lensLeft}%`,
                  top: `${lensTop}%`,
                  width: `${LENS_SIZE}%`,
                  height: `${LENS_SIZE}%`,
                }}
              />
            )}
          </div>

          {/* Render the zoomed preview in the description column via Portal */}
          {zoomPanel}
        </div>
      </div>
    </div>
  );
}
