"use client";

import { useEffect } from "react";

/**
 * Hides the main header once the reader scrolls past it. With a mouse it
 * comes back when the pointer reaches the top edge of the window and hides
 * again once the pointer moves away below it. Touch screens have no pointer
 * to hover with, so there scrolling back up brings it back. State lives in
 * html[data-header]; styles in app/[lang]/scale.css.
 */
const REVEAL_EDGE = 16;

export function HeaderAutoHide() {
  useEffect(() => {
    const root = document.documentElement;
    const header = document.querySelector<HTMLElement>(".site-header");
    if (!header) return;
    // Pages that lay the header inside a fixed-height frame never scroll the window.
    if (header.closest(".embedded-experience, .ranking-frame")) return;

    const canHover = window.matchMedia("(hover: hover) and (pointer: fine)");
    let pointerNear = false;
    let lastY = window.scrollY;
    let frame = 0;

    const set = (hidden: boolean) => {
      if (hidden === (root.dataset.header === "hidden")) return;
      if (hidden) root.dataset.header = "hidden";
      else delete root.dataset.header;
    };
    const update = () => {
      frame = 0;
      const y = window.scrollY;
      const pastHeader = y > header.offsetHeight * 1.5;
      if (!pastHeader || pointerNear) set(false);
      else if (canHover.matches) set(true);
      else if (y < lastY - 4) set(false);
      else if (y > lastY + 4) set(true);
      lastY = y;
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const onPointer = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      // Reveal at the very top edge; keep it while the pointer stays over the header.
      const near = event.clientY <= REVEAL_EDGE || (pointerNear && event.clientY <= header.getBoundingClientRect().height + 8);
      if (near !== pointerNear) { pointerNear = near; schedule(); }
    };
    const onLeaveWindow = () => { if (pointerNear) { pointerNear = false; schedule(); } };

    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("pointermove", onPointer, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeaveWindow);
    update();
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("pointermove", onPointer);
      document.documentElement.removeEventListener("mouseleave", onLeaveWindow);
      if (frame) cancelAnimationFrame(frame);
      delete root.dataset.header;
    };
  }, []);

  return null;
}
