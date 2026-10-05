/**
 * Reusable motion building blocks. Every one of them degrades to a static
 * render when the user prefers reduced motion.
 */

import {
  animate,
  motion,
  useInView,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type HTMLMotionProps,
} from "motion/react";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

import { cn } from "@/lib/cn";
import { ease } from "@/lib/motion";
import type { Cover } from "@/features/events/covers";

/** True only for a real mouse/trackpad: no tilt effects on touch screens. */
function useFinePointer() {
  const [fine] = useState(() => typeof window !== "undefined" && window.matchMedia("(pointer: fine)").matches);
  return fine;
}

/** A number that counts up from 0 the first time it scrolls into view. */
export function CountUp({ value, className, duration = 1.2 }: { value: number; className?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (!inView || reduced) return;
    const controls = animate(0, value, { duration, ease, onUpdate: (v) => setShown(Math.round(v)) });
    return () => controls.stop();
  }, [inView, value, reduced, duration]);

  // Under reduced motion, just show the final number.
  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {(reduced ? value : shown).toLocaleString()}
    </span>
  );
}

/** Fade-and-rise into view on scroll. */
export function Reveal({
  children,
  delay = 0,
  y = 24,
  className,
  ...props
}: { children: ReactNode; delay?: number; y?: number; className?: string } & HTMLMotionProps<"div">) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, ease, delay }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/**
 * A card that tilts towards the cursor in 3D, with a soft glare that follows
 * the pointer. Mouse/trackpad only, and off under reduced motion.
 */
export function TiltCard({ children, className, max = 7 }: { children: ReactNode; className?: string; max?: number }) {
  const reduced = useReducedMotion();
  const fine = useFinePointer();
  const enabled = fine && !reduced;

  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const spring = { stiffness: 220, damping: 18, mass: 0.6 };
  const rotateX = useSpring(useTransform(py, [0, 1], [max, -max]), spring);
  const rotateY = useSpring(useTransform(px, [0, 1], [-max, max]), spring);
  const glareX = useTransform(px, (v) => `${v * 100}%`);
  const glareY = useTransform(py, (v) => `${v * 100}%`);
  const glare = useMotionTemplate`radial-gradient(420px circle at ${glareX} ${glareY}, rgb(255 255 255 / 0.16), transparent 45%)`;

  if (!enabled) return <div className={cn("h-full", className)}>{children}</div>;

  return (
    <div className="h-full [perspective:900px]">
      <motion.div
        className={cn("group/tilt relative h-full [transform-style:preserve-3d]", className)}
        style={{ rotateX, rotateY }}
        onPointerMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          px.set((e.clientX - rect.left) / rect.width);
          py.set((e.clientY - rect.top) / rect.height);
        }}
        onPointerLeave={() => {
          px.set(0.5);
          py.set(0.5);
        }}
      >
        {children}
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-20 rounded-2xl opacity-0 transition-opacity duration-300 group-hover/tilt:opacity-100"
          style={{ background: glare }}
        />
      </motion.div>
    </div>
  );
}

/**
 * A cover photo with a colour placeholder that fades into the image once it
 * loads. ``transitionName`` links it to the same photo on another page
 * (View Transitions API), so a card's image morphs into the event hero.
 */
export function CoverImage({
  cover,
  alt = "",
  sizes = "(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw",
  priority,
  transitionName,
  className,
  imgClassName,
  style,
}: {
  cover: Cover;
  alt?: string;
  sizes?: string;
  priority?: boolean;
  transitionName?: string;
  className?: string;
  imgClassName?: string;
  style?: CSSProperties;
}) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div
      className={cn("relative overflow-hidden", className)}
      style={{ backgroundColor: cover.tone, viewTransitionName: transitionName, ...style }}
    >
      <img
        src={cover.small}
        srcSet={`${cover.small} 800w, ${cover.large} 1600w`}
        sizes={sizes}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={priority ? "high" : "auto"}
        onLoad={() => setLoaded(true)}
        ref={(img) => {
          // Cached images can finish loading before React attaches onLoad.
          if (img?.complete && img.naturalWidth > 0 && !loaded) setLoaded(true);
        }}
        className={cn(
          "h-full w-full object-cover transition-[opacity,filter,transform] duration-700 ease-out",
          loaded ? "opacity-100 blur-0" : "scale-105 opacity-0 blur-md",
          imgClassName,
        )}
      />
    </div>
  );
}

/** Splits a heading into words that rise into place one after another. */
export function StaggerWords({ text, className, delay = 0 }: { text: string; className?: string; delay?: number }) {
  const words = text.split(" ");
  return (
    <span className={className} aria-label={text} role="text">
      {words.map((word, i) => (
        <span key={i} className="inline-block overflow-hidden pb-[0.12em] align-top" aria-hidden="true">
          <motion.span
            className="inline-block"
            initial={{ y: "110%", opacity: 0 }}
            animate={{ y: "0%", opacity: 1 }}
            transition={{ duration: 0.7, ease, delay: delay + i * 0.06 }}
          >
            {word}
            {i < words.length - 1 ? " " : ""}
          </motion.span>
        </span>
      ))}
    </span>
  );
}
