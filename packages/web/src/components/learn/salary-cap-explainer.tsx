'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { RookieSlotEntry } from '@mockingboard/shared';
import { SALARY_CAP_BY_YEAR } from '@mockingboard/shared';
import { Routes } from '@/routes';
import { fmtDollar } from '@/lib/firebase/format';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ExplainerSection } from './explainer-section';
import { MiniProrationCalc } from './mini-proration-calc';
import { MiniRookieCalc } from './mini-rookie-calc';
import { MiniDeadMoneyCalc } from './mini-dead-money-calc';
import { MiniVetBenefitCalc } from './mini-vet-benefit-calc';
import { MiniRestructureCalc } from './mini-restructure-calc';

const SECTIONS = [
  { id: 'what-is-it', title: 'What Is the Salary Cap?' },
  { id: 'cap-hit', title: 'Cap Hit Breakdown' },
  { id: 'proration', title: 'Signing Bonus Proration' },
  { id: 'rookie-scale', title: 'Rookie Wage Scale' },
  { id: 'dead-money', title: 'Dead Money' },
  { id: 'vet-benefit', title: 'Veteran Salary Benefit' },
  { id: 'tags', title: 'Franchise & Transition Tags' },
  { id: 'restructures', title: 'Restructures' },
  { id: 'incentives', title: 'Incentives' },
] as const;

interface SalaryCapExplainerProps {
  slots: RookieSlotEntry[];
  draftYear: number;
}

export function SalaryCapExplainer({
  slots,
  draftYear,
}: SalaryCapExplainerProps) {
  const currentCap = useMemo(() => {
    const year = new Date().getFullYear();
    return SALARY_CAP_BY_YEAR[year as keyof typeof SALARY_CAP_BY_YEAR] ?? 0;
  }, []);

  const [tocSection, setTocSection] = useState('');

  return (
    <div className="lg:grid lg:grid-cols-[1fr_200px] lg:gap-8">
      {/* Main content */}
      <div className="space-y-12">
        {/* What Is the Salary Cap? */}
        <ExplainerSection id="what-is-it" title="What Is the Salary Cap?">
          <p className="text-muted-foreground">
            Every NFL team has a spending limit on player salaries each year. In{' '}
            {draftYear}, that number is{' '}
            <span className="font-mono font-semibold text-foreground">
              {fmtDollar(currentCap)}
            </span>
            . Go over it, and the league comes knocking.
          </p>
          <p className="text-muted-foreground">
            You have probably heard someone say &ldquo;the cap isn&apos;t
            real.&rdquo; It is. Teams literally cannot exceed the cap when the
            league year opens. What those people are actually talking about is
            how teams use restructures, void years, and post-June 1 cuts to
            shift money between years. The total bill never changes, though. You
            are always paying for it somewhere.
          </p>
          <div className="rounded-lg border border-mb-accent/30 bg-mb-accent/5 p-4">
            <p className="text-sm font-medium">
              The cap is real. Teams just have more tools to manage it than most
              people realize.
            </p>
          </div>
        </ExplainerSection>

        {/* Cap Hit Breakdown */}
        <ExplainerSection id="cap-hit" title="Cap Hit Breakdown">
          <p className="text-muted-foreground">
            A player&apos;s &ldquo;cap hit&rdquo; is the total amount counting
            against the cap in a given year. It adds up from a few different
            pieces:
          </p>
          <div className="space-y-2">
            {[
              {
                name: 'Base Salary',
                desc: 'The main paycheck. Hits the cap in the year it is earned.',
              },
              {
                name: 'Signing Bonus (Prorated)',
                desc: 'Split evenly across the contract length, up to 5 years. This is the piece teams manipulate the most.',
              },
              {
                name: 'Roster Bonus',
                desc: 'Kicks in when a player is on the roster at a set date, usually the start of the league year.',
              },
              {
                name: 'Option Bonus',
                desc: 'Paid when a team picks up an option on the contract. Gets prorated like a signing bonus.',
              },
              {
                name: 'Workout Bonus',
                desc: 'Earned for showing up to the team offseason workout program.',
              },
              {
                name: 'Incentives',
                desc: 'Performance bonuses. Classified as Likely To Be Earned (LTBE) or Not Likely To Be Earned (NLTBE) based on the prior season.',
              },
            ].map(({ name, desc }) => (
              <div key={name} className="rounded-lg border p-3">
                <p className="text-sm font-semibold">{name}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </ExplainerSection>

        {/* Signing Bonus Proration */}
        <ExplainerSection id="proration" title="Signing Bonus Proration">
          <p className="text-muted-foreground">
            Signing bonuses do not hit the cap all at once. They get divided
            evenly (&ldquo;prorated&rdquo;) across the length of the contract,
            maxing out at 5 years. This is how teams turn a huge upfront
            payment into a manageable annual cap charge.
          </p>
          <p className="text-muted-foreground">
            A $20M signing bonus on a 5-year deal? That is $4M per year on the
            cap instead of $20M in year one. The catch: if you cut or trade that
            player, all the remaining prorated money &ldquo;accelerates&rdquo;
            onto the current year as dead money.
          </p>
          <MiniProrationCalc />
        </ExplainerSection>

        {/* Rookie Wage Scale */}
        <ExplainerSection id="rookie-scale" title="Rookie Wage Scale">
          <p className="text-muted-foreground">
            Drafted players sign 4-year contracts where the salary is
            determined by their draft slot. Pick 1 gets more than pick 32, and
            pick 32 gets more than pick 64. The dollar amounts are set by the
            CBA, so there is no real negotiation on the numbers.
          </p>
          <p className="text-muted-foreground">
            First-round picks also come with a 5th-year option. The team can
            pick it up after the player&apos;s third season. How much it costs
            depends on where the player was drafted and whether they made the
            Pro Bowl.
          </p>
          {slots.length > 0 && (
            <MiniRookieCalc slots={slots} draftYear={draftYear} />
          )}
        </ExplainerSection>

        {/* Dead Money */}
        <ExplainerSection id="dead-money" title="Dead Money">
          <p className="text-muted-foreground">
            When a team cuts or trades a player, any leftover prorated signing
            bonus accelerates onto the cap. That is &ldquo;dead money&rdquo;:
            cap space eaten up by a player who is no longer on the roster.
          </p>
          <p className="text-muted-foreground">
            Timing matters. A <strong>pre-June 1</strong> cut dumps all the
            remaining prorated bonus into the current year. A{' '}
            <strong>post-June 1</strong> cut spreads it out: this year&apos;s
            proration stays, and the rest moves to next year. Teams get two
            post-June 1 designations each year.
          </p>
          <MiniDeadMoneyCalc />
        </ExplainerSection>

        {/* Veteran Salary Benefit */}
        <ExplainerSection id="vet-benefit" title="Veteran Salary Benefit">
          <p className="text-muted-foreground">
            The league wants teams to keep signing experienced players, so the
            CBA includes a nice trick: the Veteran Salary Benefit (Article 26).
            When a vet with 3+ accrued seasons signs a minimum-salary deal,
            their cap charge gets capped at the 2-year veteran rate. The league
            picks up the rest.
          </p>
          <p className="text-muted-foreground">
            So a 10-year vet on a minimum deal costs the same cap space as a
            second-year player. That makes vets on minimums some of the most
            cap-efficient signings a team can make.
          </p>
          <MiniVetBenefitCalc />
        </ExplainerSection>

        {/* Franchise & Transition Tags */}
        <ExplainerSection id="tags" title="Franchise & Transition Tags">
          <p className="text-muted-foreground">
            The franchise tag is a one-year tender for pending free agents. The{' '}
            <strong>non-exclusive franchise tag</strong> pays the average of the
            top 5 salaries at the position (or 120% of the player&apos;s prior
            year salary, whichever is higher). Other teams can still make
            offers, but the tagging team gets the right to match. The{' '}
            <strong>exclusive tag</strong> also uses the top 5 average, but the
            player cannot negotiate with anyone else.
          </p>
          <p className="text-muted-foreground">
            The <strong>transition tag</strong> is cheaper, using the top 10
            average instead of top 5. The original team still gets right of
            first refusal on any offer sheet.
          </p>
          <p className="text-muted-foreground">
            Tagging a player in consecutive years gets expensive fast: 120% of
            the prior tag in year 2, and 144% in year 3 and beyond. That is why
            you almost never see a player tagged three times.
          </p>
        </ExplainerSection>

        {/* Restructures */}
        <ExplainerSection id="restructures" title="Restructures">
          <p className="text-muted-foreground">
            A restructure converts base salary into signing bonus. Since signing
            bonus gets prorated over the remaining contract years (up to 5),
            this drops the current year&apos;s cap hit and pushes the cost into
            future years.
          </p>
          <p className="text-muted-foreground">
            The player has to keep at least the veteran minimum as base salary.
            Restructures are the most common way teams create cap space, but
            they are borrowing from the future. The total cap cost does not go
            down. It just moves.
          </p>
          <MiniRestructureCalc />
        </ExplainerSection>

        {/* Incentives */}
        <ExplainerSection id="incentives" title="Incentives">
          <p className="text-muted-foreground">
            Performance bonuses get classified based on whether the player hit
            the same benchmark last season:
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border p-3">
              <p className="text-sm font-semibold">
                Likely To Be Earned (LTBE)
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                The player hit the mark last year. Counts against the cap right
                away.
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-sm font-semibold">
                Not Likely To Be Earned (NLTBE)
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                The player did not hit the mark last year. Does not count
                against the cap unless they earn it, and then it rolls to the
                following year.
              </p>
            </div>
          </div>
          <p className="text-muted-foreground">
            At the end of each season, the league settles up. NLTBE incentives
            that were earned get charged to the next year. LTBE incentives that
            were not earned become cap credits.
          </p>
        </ExplainerSection>

        {/* CTA */}
        <div className="rounded-lg border border-mb-accent/30 bg-mb-accent/5 p-6 text-center">
          <p className="text-sm font-medium">
            Want to build contracts and see how the math works?
          </p>
          <Link
            href={Routes.CONTRACT_BUILDER}
            className="mt-2 inline-block text-sm font-semibold text-mb-accent hover:underline"
          >
            Try the Contract Builder
          </Link>
        </div>
      </div>

      {/* Table of contents (desktop) */}
      <nav className="hidden lg:block">
        <div className="sticky top-24 space-y-1">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            On This Page
          </p>
          {SECTIONS.map(({ id, title }) => (
            <a
              key={id}
              href={`#${id}`}
              className="block text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {title}
            </a>
          ))}
        </div>
      </nav>

      {/* Table of contents (mobile) */}
      <div className="mb-6 lg:hidden">
        <Select
          value={tocSection}
          onValueChange={(v) => {
            setTocSection(v);
            document.getElementById(v)?.scrollIntoView({ behavior: 'smooth' });
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Jump to section..." />
          </SelectTrigger>
          <SelectContent>
            {SECTIONS.map(({ id, title }) => (
              <SelectItem key={id} value={id}>
                {title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
