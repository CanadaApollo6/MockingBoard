'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/components/auth/auth-provider';
import { AuthForm } from '@/components/auth/auth-form';
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

type View = 'hero' | 'signin' | 'signup';

interface LandingHeroProps {
  error?: boolean;
}

export function LandingHero({ error }: LandingHeroProps) {
  const { user, loading } = useAuth();
  const [view, setView] = useState<View>('hero');

  return (
    <section className="relative flex h-screen flex-col items-center overflow-hidden px-4">
      {/* Animated background orb — persists across views */}
      <motion.div
        className="pointer-events-none absolute inset-0 -top-14 overflow-hidden"
        animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div className="absolute left-1/2 top-0 h-[480px] w-[720px] -translate-x-1/2 rounded-full bg-primary/8 blur-3xl" />
      </motion.div>

      {/* Center content — swaps between hero and auth form */}
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <AnimatePresence mode="wait">
          {view === 'hero' ? (
            <motion.div
              key="hero"
              className="relative"
              variants={stagger}
              initial="hidden"
              animate="show"
              exit={{ opacity: 0, y: -20, transition: { duration: 0.15 } }}
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
                Mock draft with your friends — right inside Discord or right
                here. View draft history, track picks, and watch live.
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
                className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center"
              >
                {!loading && user ? (
                  <>
                    <Link href="/drafts/new" className="w-full sm:w-auto">
                      <Button size="lg" className="w-full">
                        New Draft
                      </Button>
                    </Link>
                    <Link href="/drafts?tab=mine" className="w-full sm:w-auto">
                      <Button variant="outline" size="lg" className="w-full">
                        My Drafts
                      </Button>
                    </Link>
                  </>
                ) : (
                  <>
                    <Link href="/drafts/new" className="w-full sm:w-auto">
                      <Button size="lg" className="w-full">
                        Mock Draft Now
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="lg"
                      className="w-full sm:w-auto"
                      onClick={() => setView('signin')}
                    >
                      Sign In
                    </Button>
                    <Button
                      variant="outline"
                      size="lg"
                      className="w-full sm:w-auto"
                      onClick={() => setView('signup')}
                    >
                      Create Account
                    </Button>
                  </>
                )}
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key="auth"
              className="w-full max-w-sm"
              initial={{ opacity: 0, y: 20 }}
              animate={{
                opacity: 1,
                y: 0,
                transition: { type: 'spring', damping: 25, stiffness: 200 },
              }}
              exit={{ opacity: 0, y: -20, transition: { duration: 0.15 } }}
            >
              <button
                type="button"
                onClick={() => setView('hero')}
                className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path d="M10 3L5 8l5 5" />
                </svg>
                Back
              </button>
              <AuthForm initialMode={view === 'signup' ? 'signup' : 'signin'} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Feature cards — bottom of viewport, hidden during auth */}
      <AnimatePresence>
        {view === 'hero' && (
          <motion.div
            className="w-full max-w-screen-xl pb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{
              opacity: 1,
              y: 0,
              transition: {
                type: 'spring',
                damping: 25,
                stiffness: 200,
                delay: 0.4,
              },
            }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
          >
            <div className="grid gap-6 sm:grid-cols-3">
              {FEATURES.map((feature) => (
                <Card
                  key={feature.title}
                  className="h-full transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                >
                  <CardContent className="p-5">
                    <h3 className="font-[family-name:var(--font-display)] text-lg font-bold uppercase">
                      {feature.title}
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
