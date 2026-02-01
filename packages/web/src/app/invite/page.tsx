import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const DISCORD_CLIENT_ID = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;
const PERMISSIONS = '346176'; // Send Messages, Embed Links, Read Message History, Manage Messages, Add Reactions
const INVITE_URL = `https://discord.com/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&permissions=${PERMISSIONS}&scope=bot+applications.commands`;

const FEATURES = [
  {
    title: 'Draft in Discord',
    description:
      'Run full mock drafts right in your server. Pick players, trade picks, and compete with friends — no browser needed.',
  },
  {
    title: 'CPU Opponents',
    description:
      'Fill out empty teams with CPU drafters that pick based on team needs and consensus rankings.',
  },
  {
    title: 'Live Trades',
    description:
      'Propose and execute trades mid-draft. CPU teams evaluate offers based on draft value charts.',
  },
  {
    title: 'Draft History',
    description:
      'Every pick is saved. Review past drafts, track your picks, and compare strategies across seasons.',
  },
];

export default function InvitePage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <div className="flex flex-col items-center text-center">
        <Image
          src="/logo.png"
          alt="MockingBoard"
          width={80}
          height={80}
          className="mb-6 h-20 w-20"
          unoptimized
        />

        <h1 className="text-4xl font-bold tracking-tight">
          Add MockingBoard to Discord
        </h1>
        <p className="mt-4 max-w-lg text-lg text-muted-foreground">
          Run mock drafts with your friends right inside your Discord server.
          Pick players, make trades, and track every draft.
        </p>

        <div className="mt-8 flex gap-3">
          <a href={INVITE_URL} target="_blank" rel="noopener noreferrer">
            <Button size="lg">Add to Discord</Button>
          </a>
          <Link href="/drafts/new">
            <Button variant="outline" size="lg">
              Draft on Web
            </Button>
          </Link>
        </div>
      </div>

      <div className="mt-16 grid gap-4 sm:grid-cols-2">
        {FEATURES.map((feature) => (
          <Card key={feature.title}>
            <CardContent className="p-5">
              <h3 className="font-semibold">{feature.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {feature.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-12 text-center text-sm text-muted-foreground">
        <p>
          MockingBoard requires the following permissions: Send Messages, Embed
          Links, Read Message History, Manage Messages, and Add Reactions.
        </p>
      </div>
    </main>
  );
}
