'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { LogIn, UserPlus, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/customer/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailOrUsername, password }),
      });

      const data = await response.json();

      if (response.ok) {
        login(data.token, data.refreshToken, data.user);
        toast.success('Welcome back to Smartifly!');
        router.push('/');
      } else {
        toast.error(data.error || 'Login failed');
      }
    } catch (error) {
      toast.error('Connection error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container relative flex flex-col items-center justify-center min-h-[calc(100vh-80px)] py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-[450px]"
      >
        <Card className="glass-card border-white/10 shadow-2xl overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-accent to-primary" />
          
          <CardHeader className="space-y-1 pt-8 text-center">
            <div className="mx-auto bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mb-4 border border-primary/20">
              <LogIn className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-3xl font-bold tracking-tight">Customer Login</CardTitle>
            <CardDescription className="text-foreground-secondary">
              Enter your credentials to access your Smartifly account
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleLogin}>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="identity" className="text-sm font-medium">Email or Username</Label>
                <Input
                  id="identity"
                  type="text"
                  placeholder="name@example.com"
                  className="bg-background-input border-white/5 focus:border-primary/50"
                  value={emailOrUsername}
                  onChange={(e) => setEmailOrUsername(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password text-sm font-medium">Password</Label>
                  <Link href="#" className="text-xs text-primary hover:underline">Forgot password?</Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="bg-background-input border-white/5 focus:border-primary/50"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </CardContent>
            
            <CardFooter className="flex flex-col gap-4 pb-8">
              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-primary to-primary-dark hover:shadow-glow-violet transition-all duration-300" 
                disabled={isLoading}
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
                {!isLoading && <ArrowRight className="ml-2 w-4 h-4" />}
              </Button>
              
              <div className="relative w-full text-center">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-white/5" />
                </div>
                <span className="relative bg-[#0B1220] px-2 text-xs text-foreground-muted uppercase tracking-widest">
                  New to Smartifly?
                </span>
              </div>
              
              <Link href="/register" className="w-full">
                <Button variant="outline" className="w-full border-white/10 hover:bg-white/5">
                  <UserPlus className="mr-2 w-4 h-4" />
                  Create an Account
                </Button>
              </Link>
            </CardFooter>
          </form>
        </Card>
      </motion.div>

      {/* Decorative Elements */}
      <div className="absolute top-1/4 -left-20 w-64 h-64 bg-primary/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-64 h-64 bg-accent/20 rounded-full blur-[100px] pointer-events-none" />
    </div>
  );
}
