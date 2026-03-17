'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Routes } from '@/routes';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ExplainerSection } from './explainer-section';

const SECTIONS = [
  { id: 'overview', title: 'How the Draft Works' },
  { id: 'order', title: 'Draft Order' },
  { id: 'trades', title: 'Trading Picks' },
  { id: 'comp-picks', title: 'Compensatory Picks' },
  { id: 'rookie-deals', title: 'Rookie Contracts' },
  { id: 'udfas', title: 'Undrafted Free Agents' },
  { id: 'forfeited', title: 'Forfeited Picks' },
  { id: 'declare', title: 'Declaring for the Draft' },
  { id: 'combine', title: 'The Combine & Pro Days' },
] as const;

export function NflDraftExplainer() {
  const [tocSection, setTocSection] = useState('');

  return (
    <div className="lg:grid lg:grid-cols-[1fr_200px] lg:gap-8">
      <div className="space-y-12">
        {/* How the Draft Works */}
        <ExplainerSection id="overview" title="How the Draft Works">
          <p className="text-muted-foreground">
            The NFL Draft is how teams add college players (and other eligible
            players) to their rosters. It runs over three days in late April,
            with 7 rounds and 32 picks per round, plus compensatory selections.
            That comes out to roughly 250+ picks total each year.
          </p>
          <p className="text-muted-foreground">
            Teams pick one at a time in a set order. Once a player is selected,
            no other team can pick them. Any eligible player who is not drafted
            becomes an undrafted free agent (UDFA) and can sign with whoever
            they want.
          </p>
          <p className="text-muted-foreground">
            Round 1 happens on Thursday night, rounds 2-3 on Friday, and rounds
            4-7 on Saturday. The time between picks gets shorter as the rounds
            go on: 10 minutes per pick in round 1, 7 minutes in round 2, and 5
            minutes from round 3 onward.
          </p>
        </ExplainerSection>

        {/* Draft Order */}
        <ExplainerSection id="order" title="Draft Order">
          <p className="text-muted-foreground">
            The draft order is based on the previous season&apos;s record. Worst
            record picks first, best record picks last. Teams that made the
            playoffs are ordered by how far they went, with the Super Bowl loser
            picking 31st and the champion picking 32nd.
          </p>
          <p className="text-muted-foreground">
            For non-playoff teams with the same record, the tiebreaker is
            strength of schedule (SOS). The team that played a weaker schedule
            picks earlier. If SOS is also tied, a coin flip decides it.
          </p>
          <p className="text-muted-foreground">
            This order applies to every round, though it gets adjusted by trades
            and compensatory picks. Check out the{' '}
            <Link
              href={Routes.DRAFT_ORDER}
              className="font-medium text-mb-accent hover:underline"
            >
              current draft order
            </Link>{' '}
            to see how things stand right now.
          </p>
        </ExplainerSection>

        {/* Trading Picks */}
        <ExplainerSection id="trades" title="Trading Picks">
          <p className="text-muted-foreground">
            Teams can trade draft picks for other picks, for players, or for
            both. Trades can happen during the draft itself, but also throughout
            the offseason and regular season. The trade window opens at the
            start of the league year (mid-March) and closes at the trade
            deadline in early November. Between the deadline and the start of
            the next league year, no trades can happen.
          </p>
          <p className="text-muted-foreground">
            Teams can trade picks from future drafts, but only up to three years
            out (inclusive of the current year). So heading into the 2026 draft,
            a team can deal picks from the 2026, 2027, and 2028 drafts, but not
            2029.
          </p>
          <p className="text-muted-foreground">
            There is no hard rule on what a pick is &ldquo;worth,&rdquo; but
            most front offices use some version of a trade value chart to
            evaluate deals. The most famous one is the Jimmy Johnson chart from
            the 1990s, though modern analytics have produced better models.
          </p>
          <p className="text-muted-foreground">
            A few other rules: compensatory picks could not be traded until
            2017, and now they can be. Any trade during the draft has to be
            approved by the league office before the pick is made.
          </p>
          <p className="text-muted-foreground">
            Want to see how a trade stacks up?{' '}
            <Link
              href={Routes.TRADE_CALCULATOR}
              className="font-medium text-mb-accent hover:underline"
            >
              Try the trade calculator
            </Link>
            .
          </p>
        </ExplainerSection>

        {/* Compensatory Picks */}
        <ExplainerSection id="comp-picks" title="Compensatory Picks">
          <p className="text-muted-foreground">
            Compensatory picks are extra selections added to the end of rounds 3
            through 7. They are awarded to teams that lost more or better free
            agents than they signed the previous offseason.
          </p>
          <p className="text-muted-foreground">
            The formula is not public, but it is based on the salary, playing
            time, and postseason honors of the players who left versus the ones
            who were signed. A team can receive up to four comp picks per year.
            The round (3rd through 7th) depends on the value of the player lost.
          </p>
          <p className="text-muted-foreground">
            One thing that often confuses people: players who are released do
            not factor into the comp pick formula. Only unrestricted free agents
            who sign with a new team count.
          </p>
        </ExplainerSection>

        {/* Rookie Contracts */}
        <ExplainerSection id="rookie-deals" title="Rookie Contracts">
          <p className="text-muted-foreground">
            All drafted players sign 4-year contracts with salaries determined
            by their draft slot. The CBA sets the dollar amounts, so
            negotiations are pretty limited. The main sticking point is usually
            offset language (whether the old team still pays if the player gets
            cut and signs elsewhere).
          </p>
          <p className="text-muted-foreground">
            First-round picks have a 5th-year team option that the club can
            exercise after the player&apos;s third season. The amount depends on
            draft position and Pro Bowl appearances. It is fully guaranteed once
            the option year starts.
          </p>
          <p className="text-muted-foreground">
            For a deeper look at the numbers, check out the{' '}
            <Link
              href={Routes.LEARN_SALARY_CAP}
              className="font-medium text-mb-accent hover:underline"
            >
              salary cap guide
            </Link>
            , which has an interactive rookie wage scale calculator.
          </p>
        </ExplainerSection>

        {/* UDFAs */}
        <ExplainerSection id="udfas" title="Undrafted Free Agents">
          <p className="text-muted-foreground">
            Any draft-eligible player who does not get selected in 7 rounds
            becomes an undrafted free agent. They are free to sign with any
            team, and the recruiting starts immediately after the draft ends.
            Teams call players during the late rounds to pitch their situation.
          </p>
          <p className="text-muted-foreground">
            UDFA contracts are 3-year minimum-salary deals, though many include
            small signing bonuses ($10K-$200K) to sweeten the offer. The odds
            are not great: most UDFAs get cut during training camp. But the ones
            who stick around can become real contributors. Tony Romo, Kurt
            Warner, Priest Holmes, and more recently James Robinson and Amon-Ra
            St. Brown went undrafted.
          </p>
        </ExplainerSection>

        {/* Forfeited Picks */}
        <ExplainerSection id="forfeited" title="Forfeited Picks">
          <p className="text-muted-foreground">
            The league can take away draft picks as a penalty. This usually
            happens for tampering (contacting a player or coach under contract
            with another team), violating the salary cap, or breaking other
            league rules. The severity of the violation determines which round
            the team loses.
          </p>
          <p className="text-muted-foreground">
            Some famous examples: the Patriots lost a first-round pick in
            Deflategate, the Bears lost draft picks for a tampering case, and
            the Dolphins lost a first-rounder for tampering with Tom Brady and
            Sean Payton. Teams do not get these picks back.
          </p>
        </ExplainerSection>

        {/* Declaring for the Draft */}
        <ExplainerSection id="declare" title="Declaring for the Draft">
          <p className="text-muted-foreground">
            College players become eligible for the draft once they are three
            years out of high school. Underclassmen (juniors, redshirt
            sophomores) have to officially declare by a January deadline. If
            they do not declare, they stay in school.
          </p>
          <p className="text-muted-foreground">
            Since 2020, underclassmen can get an evaluation from the NFL Draft
            Advisory Board before deciding. The board gives them a grade
            estimate (first round, second round, etc.) to help them decide
            whether to come out or stay in school. Players can withdraw from the
            draft and return to college as long as they have not signed with an
            agent.
          </p>
        </ExplainerSection>

        {/* The Combine & Pro Days */}
        <ExplainerSection id="combine" title="The Combine & Pro Days">
          <p className="text-muted-foreground">
            The NFL Scouting Combine is an invitation-only event held in
            Indianapolis each February. About 300 prospects get invited to run
            drills, take medical exams, and interview with teams. The main
            on-field tests: 40-yard dash, bench press, vertical jump, broad
            jump, 3-cone drill, and shuttle run.
          </p>
          <p className="text-muted-foreground">
            Pro Days happen in March and April at individual college campuses.
            They are a chance for players to run the same drills in front of
            scouts, especially if they did not get a Combine invite or want to
            improve on a number. Some players skip the Combine entirely and bet
            on their Pro Day instead.
          </p>
          <p className="text-muted-foreground">
            The testing numbers matter, but teams care more about the tape.
            Combine results can move a player up or down a few spots, but film
            is still king. A bad 40 time does not sink a good player, and a
            blazing 40 does not save a bad one.
          </p>
        </ExplainerSection>

        {/* CTA */}
        <div className="rounded-lg border border-mb-accent/30 bg-mb-accent/5 p-6 text-center">
          <p className="text-sm font-medium">
            Ready to put your draft knowledge to the test?
          </p>
          <Link
            href={Routes.DRAFT_NEW}
            className="mt-2 inline-block text-sm font-semibold text-mb-accent hover:underline"
          >
            Start a mock draft
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
