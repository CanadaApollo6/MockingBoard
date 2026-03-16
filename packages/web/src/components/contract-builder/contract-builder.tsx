'use client';

import Link from 'next/link';
import { Routes } from '@/routes';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BasicTier } from './basic-tier';
import { StandardTier } from './standard-tier';
import { AdvancedTier } from './advanced-tier';

export function ContractBuilder() {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="basic">
        <TabsList>
          <TabsTrigger value="basic">Basic</TabsTrigger>
          <TabsTrigger value="standard">Standard</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        <TabsContent value="basic">
          <BasicTier />
        </TabsContent>
        <TabsContent value="standard">
          <StandardTier />
        </TabsContent>
        <TabsContent value="advanced">
          <AdvancedTier />
        </TabsContent>
      </Tabs>

      <p className="text-sm text-muted-foreground">
        New to the salary cap?{' '}
        <Link
          href={Routes.LEARN_SALARY_CAP}
          className="font-medium text-mb-accent hover:underline"
        >
          Learn how the NFL salary cap works
        </Link>
      </p>
    </div>
  );
}
