import { useQuery } from "@tanstack/react-query";
import { ArrowDown, CalendarPlus, ShieldCheck } from "lucide-react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "motion/react";
import { useEffect, useState } from "react";

import { CountUp, CoverImage, StaggerWords } from "@/components/motion/primitives";
import { useOrganisers, useSwitchViewer } from "@/features/role/useSwitchViewer";
import { api, queryKeys } from "@/lib/api/endpoints";
import { cn } from "@/lib/cn";
import { ease } from "@/lib/motion";

import { getCover, type CoverKey } from "../covers";

const SLIDES: CoverKey[] = ["string-lights", "open-mic", "market-hall", "yoga-park"];
const SLIDE_MS = 6500;

/**
 * The Discover hero: a slow Ken Burns crossfade between event photos, a
 * subtle mouse parallax, a word-by-word headline and live counters. Under
 * reduced motion it's a single still photo.
 */
export function DiscoverHero() {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const stats = useQuery({ queryKey: queryKeys.publicStats(), queryFn: ({ signal }) => api.publicStats(signal) });
  const switchTo = useSwitchViewer();
  const { data: organisers } = useOrganisers();

  useEffect(() => {
    if (reduced) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % SLIDES.length), SLIDE_MS);
    return () => clearInterval(timer);
  }, [reduced]);

  // Parallax: the photo drifts a few pixels against the cursor.
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const x = useSpring(mx, { stiffness: 60, damping: 20 });
  const y = useSpring(my, { stiffness: 60, damping: 20 });

  const cover = getCover(SLIDES[index] ?? "string-lights");

  return (
    <section
      aria-labelledby="hero-heading"
      className="relative isolate mb-6 overflow-hidden rounded-3xl bg-slate-950 text-white shadow-lift"
      onPointerMove={(e) => {
        if (reduced || e.pointerType !== "mouse") return;
        const rect = e.currentTarget.getBoundingClientRect();
        mx.set(((e.clientX - rect.left) / rect.width - 0.5) * -24);
        my.set(((e.clientY - rect.top) / rect.height - 0.5) * -16);
      }}
    >
      {/* Background slideshow */}
      <motion.div className="absolute -inset-6 -z-10" style={{ x, y }} aria-hidden="true">
        <AnimatePresence initial={false}>
          <motion.div
            key={cover.key}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.4, ease: "easeInOut" }}
          >
            <motion.div
              className="h-full w-full"
              initial={{ scale: 1.14 }}
              animate={{ scale: 1.02 }}
              transition={{ duration: SLIDE_MS / 1000 + 1.5, ease: "linear" }}
            >
              <CoverImage cover={cover} priority sizes="100vw" className="h-full w-full" />
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </motion.div>
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-r from-slate-950/90 via-slate-950/60 to-slate-950/5" />
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />
      <div aria-hidden="true" className="absolute -left-24 -top-24 -z-10 size-80 rounded-full bg-indigo-500/30 blur-3xl" />

      <div className="relative flex min-h-[420px] flex-col justify-end gap-7 px-6 py-7 sm:px-10 sm:py-9 lg:min-h-[340px] lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <motion.p
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease }}
            className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white ring-1 ring-white/20 backdrop-blur-md"
          >
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-70 motion-reduce:animate-none" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
            </span>
            Community events near you
          </motion.p>
          <h1 id="hero-heading" className="mt-4 text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl">
            <StaggerWords text="Find something good to do this week" delay={0.1} />
          </h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease, delay: 0.55 }}
            className="mt-3 max-w-xl text-[15px] leading-relaxed text-white/80"
          >
            Repair cafés, open mics, sunrise yoga and more, all run by local groups. Register your interest in one
            tap, with no account needed.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease, delay: 0.7 }}
            className="mt-5 flex flex-wrap gap-3"
          >
            <a
              href="#events"
              onClick={(e) => {
                // Smooth-scroll only here (a global smooth scroll would also animate route changes).
                e.preventDefault();
                document.getElementById("events")?.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
              }}
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-white px-5 text-sm font-semibold text-slate-950 shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
            >
              Explore events
              <ArrowDown className="size-4" aria-hidden="true" />
            </a>
            <button
              type="button"
              onClick={() => switchTo({ role: "organiser", organiserId: organisers?.[0]?.id ?? "organiser-1" })}
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-white/10 px-5 text-sm font-semibold text-white ring-1 ring-white/25 backdrop-blur-md transition hover:bg-white/20"
            >
              <CalendarPlus className="size-4" aria-hidden="true" />
              Host an event
            </button>
          </motion.div>
        </div>

        <div className="flex flex-col gap-4 lg:w-56 lg:shrink-0">
          <dl className="grid grid-cols-3 gap-3 rounded-2xl bg-white/[0.07] p-4 ring-1 ring-white/15 backdrop-blur-md lg:grid-cols-1 lg:gap-4">
            {[
              { label: "upcoming events", value: stats.data?.upcoming_events },
              { label: "spots claimed", value: stats.data?.registrations },
              { label: "local organisers", value: stats.data?.organisers },
            ].map((stat) => (
              <div key={stat.label} className="flex flex-col-reverse">
                <dt className="text-xs text-white/65">{stat.label}</dt>
                <dd className="text-2xl font-semibold tracking-tight">
                  {stat.value === undefined ? <span className="text-white/40">–</span> : <CountUp value={stat.value} />}
                </dd>
              </div>
            ))}
          </dl>

          <div className="flex items-center justify-between gap-3">
            <p className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-medium text-emerald-200 ring-1 ring-emerald-300/30 backdrop-blur-md">
              <ShieldCheck className="size-3.5" aria-hidden="true" />
              Anonymous by design
            </p>
            {!reduced && (
              <div className="flex gap-1.5" role="group" aria-label="Background photo">
                {SLIDES.map((key, i) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setIndex(i)}
                    aria-label={`Show photo ${i + 1} of ${SLIDES.length}`}
                    aria-current={i === index}
                    className="group grid h-6 place-items-center"
                  >
                    <span className={cn("block h-1 overflow-hidden rounded-full bg-white/30 transition-all", i === index ? "w-8" : "w-3 group-hover:bg-white/60")}>
                      {i === index && (
                        <motion.span
                          key={`${key}-${index}`}
                          className="block h-full origin-left bg-white"
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: 1 }}
                          transition={{ duration: SLIDE_MS / 1000, ease: "linear" }}
                        />
                      )}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <p className="absolute bottom-1.5 right-4 text-[10px] text-white/45">
        Photo: <a href={cover.creditUrl} target="_blank" rel="noreferrer" className="underline-offset-2 hover:text-white/80 hover:underline">{cover.author}</a> / Unsplash
      </p>
    </section>
  );
}
