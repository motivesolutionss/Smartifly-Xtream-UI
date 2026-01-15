"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";

export default function PackagesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("Packages page error:", error);
  }, [error]);

  return (
    <section className="section-padding">
      <div className="container">
        <Card className="max-w-xl mx-auto text-center">
          <CardContent className="py-12">
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-destructive" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  Something went wrong!
                </h2>
                <p className="text-muted-foreground mb-6">
                  We couldn&apos;t load the packages. Please try again.
                </p>
              </div>
              <div className="flex gap-4">
                <Button onClick={reset} variant="hero">
                  Try again
                </Button>
                <Link href="/">
                  <Button variant="outline">Go Home</Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

