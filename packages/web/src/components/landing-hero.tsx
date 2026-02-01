'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, damping: 25, stiffness: 200 },
  },
};

const FEATURES = [
  {
    title: 'Draft in Discord',
    description:
      'Run mock drafts right in your server with slash commands. No browser tab needed.',
  },
  {
    title: 'Draft on the Web',
    description:
      'Full interactive draft board, player search, and pick tracking in your browser.',
  },
  {
    title: 'Track Your History',
    description:
      'Every draft is saved. Review past picks, compare strategies, and watch live.',
  },
];

interface LandingHeroProps {
  error?: boolean;
}

export function LandingHero({ error }: LandingHeroProps) {
  return (
    <>
      {/* Hero section */}
      <section className="relative flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center px-4 text-center">
        {/* Animated background orb */}
        <motion.div
          className="pointer-events-none absolute inset-0 -top-14 overflow-hidden"
          animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div className="absolute left-1/2 top-0 h-[480px] w-[720px] -translate-x-1/2 rounded-full bg-primary/8 blur-3xl" />
        </motion.div>

        <motion.div
          className="relative"
          variants={stagger}
          initial="hidden"
          animate="show"
        >
          <motion.div variants={fadeUp}>
            <Image
              src="/logo.png"
              alt="MockingBoard"
              width={96}
              height={96}
              className="mx-auto mb-6 h-24 w-24"
              unoptimized
            />
          </motion.div>

          <motion.h1
            variants={fadeUp}
            className="font-[family-name:var(--font-display)] text-5xl font-bold uppercase tracking-tight sm:text-6xl"
          >
            MockingBoard
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="mt-4 max-w-md text-lg text-muted-foreground"
          >
            Mock draft with your friends — right inside Discord. View draft
            history, track picks, and watch live.
          </motion.p>

          {error && (
            <motion.p
              variants={fadeUp}
              className="mt-4 text-sm text-destructive"
            >
              Sign-in failed. Please try again.
            </motion.p>
          )}

          <motion.div
            variants={fadeUp}
            className="mt-8 flex justify-center gap-3"
          >
            <Link href="/drafts/new">
              <Button size="lg">Mock Draft Now</Button>
            </Link>
            <Link href="/drafts">
              <Button variant="outline" size="lg">
                View Drafts
              </Button>
            </Link>
            <Link href="/auth">
              <Button variant="outline" size="lg">
                Sign In
              </Button>
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* Features section — scroll-triggered */}
      <section className="mx-auto max-w-4xl px-4 pb-24">
        <div className="grid gap-6 sm:grid-cols-3">
          {FEATURES.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{
                type: 'spring',
                damping: 25,
                stiffness: 200,
                delay: i * 0.1,
              }}
            >
              <Card className="h-full">
                <CardContent className="p-5">
                  <h3 className="font-[family-name:var(--font-display)] text-lg font-bold uppercase">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>
    </>
  );
}
