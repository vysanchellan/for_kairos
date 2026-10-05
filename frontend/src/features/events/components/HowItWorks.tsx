import { CalendarPlus, PartyPopper, Search, Ticket } from "lucide-react";
import { motion, useScroll, useSpring, useTransform } from "motion/react";
import { useRef } from "react";

import { CoverImage, Reveal } from "@/components/motion/primitives";
import { useOrganisers, useSwitchViewer } from "@/features/role/useSwitchViewer";

import { getCover } from "../covers";

const STEPS = [
  { icon: Search, title: "Find something", body: "Browse what's on nearby: filter by what you're into, or just see what's coming up this week." },
  { icon: Ticket, title: "Register in one tap", body: "No account, no email, no tracking. You get a reference number and that's it." },
  { icon: PartyPopper, title: "Show up and enjoy", body: "Organisers see how many are coming, never who. Just turn up and say hello." },
];

/** Scroll-driven explainer: the progress line fills as you scroll through it. */
export function HowItWorks() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 85%", "end 60%"] });
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 24 });

  return (
    <section ref={ref} aria-labelledby="how-heading" className="mt-20">
      <Reveal className="max-w-xl">
        <p className="text-sm font-medium text-accent-text">How it works</p>
        <h2 id="how-heading" className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
          From "what's on?" to "see you there" in under a minute
        </h2>
      </Reveal>

      <div className="relative mt-10">
        <div aria-hidden="true" className="absolute left-0 right-0 top-6 hidden h-px bg-border md:block">
          <motion.div className="h-full origin-left bg-gradient-to-r from-accent via-violet-500 to-fuchsia-500" style={{ scaleX: progress }} />
        </div>
        <ol className="grid gap-8 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <li key={step.title}>
              <Reveal delay={i * 0.12} className="relative">
                <span className="relative z-10 grid size-12 place-items-center rounded-2xl bg-surface text-accent-text shadow-card ring-1 ring-border">
                  <step.icon className="size-5" aria-hidden="true" />
                </span>
                <span aria-hidden="true" className="pointer-events-none absolute -top-6 right-2 select-none text-7xl font-bold text-fg/[0.04]">
                  0{i + 1}
                </span>
                <h3 className="mt-4 font-semibold">{step.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">{step.body}</p>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>

      <HostBand />
    </section>
  );
}

function HostBand() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["-12%", "12%"]);
  const switchTo = useSwitchViewer();
  const { data: organisers } = useOrganisers();

  return (
    <Reveal className="mt-16">
      <div ref={ref} className="relative isolate overflow-hidden rounded-3xl bg-slate-950 px-6 py-12 text-white sm:px-12 sm:py-16">
        <motion.div aria-hidden="true" className="absolute -inset-y-[15%] inset-x-0 -z-10" style={{ y }}>
          <CoverImage cover={getCover("market-hall")} sizes="100vw" className="h-full w-full" />
        </motion.div>
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-r from-indigo-950/95 via-indigo-950/75 to-indigo-900/30" />
        <div className="max-w-lg">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Got an idea for an event?</h2>
          <p className="mt-3 text-white/80">
            Run a repair café, a reading circle or a five-a-side. Submit it in two minutes; an admin reviews it and it goes live.
          </p>
          <button
            type="button"
            onClick={() => switchTo({ role: "organiser", organiserId: organisers?.[0]?.id ?? "organiser-1" })}
            className="mt-6 inline-flex h-11 items-center gap-2 rounded-lg bg-white px-5 text-sm font-semibold text-slate-950 shadow-lg transition hover:-translate-y-0.5"
          >
            <CalendarPlus className="size-4" aria-hidden="true" />
            Try it as an organiser
          </button>
        </div>
      </div>
    </Reveal>
  );
}
