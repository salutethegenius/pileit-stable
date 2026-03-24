"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import Portal from "@mui/material/Portal";
import MiniPortal from "./MiniPortal";
import {
  varZoomIn,
  varZoomInLeft,
  varZoomInRight,
} from "@/components/animate/zoom";
import { usePortalData } from "@/providers/PortalProvider";

export default function VideoPortalContainer() {
  const { miniModalVideo, anchorElement } = usePortalData();
  const container = useRef<HTMLDivElement>(null);
  const rect = anchorElement?.getBoundingClientRect();

  const hasToRender = !!miniModalVideo && !!anchorElement;
  let isFirstElement = false;
  let isLastElement = false;
  let variant = varZoomIn;
  if (hasToRender && anchorElement) {
    const parentElement = anchorElement.closest(".slick-active");
    const nextSiblingOfParentElement = parentElement?.nextElementSibling;
    const previousSiblingOfParentElement =
      parentElement?.previousElementSibling;
    if (
      !previousSiblingOfParentElement?.classList.contains("slick-active")
    ) {
      isFirstElement = true;
      variant = varZoomInLeft;
    } else if (!nextSiblingOfParentElement?.classList.contains("slick-active")) {
      isLastElement = true;
      variant = varZoomInRight;
    }
  }

  return (
    <>
      {hasToRender && miniModalVideo && anchorElement && (
        <Portal container={container.current}>
          <MiniPortal video={miniModalVideo} anchorElement={anchorElement} />
        </Portal>
      )}
      <motion.div
        ref={container}
        initial={false}
        animate={hasToRender ? "animate" : "exit"}
        variants={variant}
        style={{
          zIndex: 1300,
          position: "absolute",
          display: "inline-block",
          ...(rect && {
            top: rect.top + window.scrollY - 0.45 * rect.height,
            ...(isLastElement
              ? {
                  right: document.documentElement.clientWidth - rect.right,
                }
              : {
                  left: isFirstElement
                    ? rect.left
                    : rect.left - 0.12 * rect.width,
                }),
          }),
        }}
      />
    </>
  );
}
