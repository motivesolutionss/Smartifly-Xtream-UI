'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { toast } from 'sonner';
import { Tv, MonitorCheck, Loader2, ShieldAlert, ArrowRight, CheckCircle2 } from 'lucide-react';

function ActivationContent() {
  const { user, token: authStoreToken, isLoading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [settingsCode, setSettingsCode] = useState('');
  const [isActivating, setIsActivating] = useState(false);
  const [step, setStep] = useState<'input' | 'confirm' | 'success'>('input');
  
  const urlToken = searchParams.get('token');

  useEffect(() => {
    if (!authLoading && !user) {
      toast.error('Please login to activate your device');
      router.push(`/login?redirect=/activate${urlToken ? `?token=${urlToken}` : ''}`);
    }
  }, [user, authLoading, router, urlToken]);

  const handleActivate = async () => {
    if (!settingsCode && !urlToken) {
      toast.error('Please enter an activation code');
      return;
    }

    setIsActivating(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/device/activate`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authStoreToken}`
        },
        body: JSON.stringify({ 
          settingsCode: settingsCode.toUpperCase(),
          customerId: user?.id 
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setStep('success');
        toast.success('Device activated successfully!');
      } else {
        toast.error(data.error || 'Failed to activate device');
      }
    } catch (error) {
      toast.error('Network error. Please try again.');
    } finally {
      setIsActivating(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-12">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        {/* Left: Illustration/Info */}
        <div className="hidden md:block space-y-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold tracking-widest uppercase">
              Device Management
            </div>
            <h1 className="text-5xl font-bold leading-tight">
              Link Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">Smartifly TV</span>
            </h1>
            <p className="text-foreground-secondary text-lg">
              Unlock the full potential of your streaming experience by linking your Android TV device to your account.
            </p>
          </motion.div>

          <div className="space-y-4 pt-4">
            {[
              { icon: CheckCircle2, text: 'Synchronized Watchlist across devices' },
              { icon: CheckCircle2, text: 'Premium 4K Content Access' },
              { icon: CheckCircle2, text: 'Parental Controls & Profile Settings' }
            ].map((item, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + (i * 0.1) }}
                className="flex items-center gap-3 text-foreground-muted"
              >
                <item.icon className="w-5 h-5 text-success" />
                <span>{item.text}</span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Right: Activation Form */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <AnimatePresence mode="wait">
            {step === 'input' && (
              <Card key="input" className="glass-card border-white/10 shadow-2xl relative">
                <CardHeader className="text-center pb-2">
                  <div className="mx-auto bg-primary/10 w-20 h-20 rounded-2xl flex items-center justify-center mb-6 border border-primary/20 rotate-3">
                    <Tv className="w-10 h-10 text-primary -rotate-3" />
                  </div>
                  <CardTitle className="text-2xl font-bold">Enter Activation Code</CardTitle>
                  <CardDescription>
                    Enter the 6-digit code displayed on your TV screen
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <Input
                      placeholder="XXXX-XX"
                      className="text-center text-3xl font-mono tracking-[0.5em] h-20 bg-background-input border-white/10 uppercase focus:ring-primary/50"
                      value={settingsCode}
                      onChange={(e) => setSettingsCode(e.target.value)}
                      maxLength={7}
                    />
                    <div className="flex items-start gap-3 p-4 rounded-lg bg-warning/5 border border-warning/20">
                      <ShieldAlert className="w-5 h-5 text-warning shrink-0" />
                      <p className="text-xs text-warning/80 leading-relaxed">
                        This code expires in 1 hour. If your code isn't working, please refresh the QR code on your TV.
                      </p>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    className="w-full h-14 bg-gradient-to-r from-primary to-primary-dark text-lg font-bold hover:shadow-glow-violet group"
                    onClick={handleActivate}
                    disabled={isActivating || settingsCode.length < 4}
                  >
                    {isActivating ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <>
                        Activate Device
                        <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            )}

            {step === 'success' && (
              <Card key="success" className="glass-card border-success/20 bg-success/5 shadow-2xl text-center py-8">
                <CardHeader>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', damping: 12 }}
                    className="mx-auto bg-success/20 w-24 h-24 rounded-full flex items-center justify-center mb-6 border border-success/30"
                  >
                    <MonitorCheck className="w-12 h-12 text-success" />
                  </motion.div>
                  <CardTitle className="text-3xl font-bold text-success">Device Linked!</CardTitle>
                  <CardDescription className="text-lg pt-2">
                    Your TV is now successfully linked to <strong>{user?.username}</strong>.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-foreground-muted">
                    Your TV app will automatically refresh and log you in within a few seconds.
                  </p>
                </CardContent>
                <CardFooter className="justify-center pt-8">
                  <Button onClick={() => router.push('/')} variant="outline" className="border-white/10">
                    Go to Dashboard
                  </Button>
                </CardFooter>
              </Card>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}

export default function ActivationPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </div>
    }>
      <ActivationContent />
    </Suspense>
  );
}
