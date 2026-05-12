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
import { UserPlus, LogIn, ArrowRight, ShieldCheck } from 'lucide-react';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/customer/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password, fullName }),
      });

      const data = await response.json();

      if (response.ok) {
        login(data.token, data.refreshToken, data.user);
        toast.success('Welcome to Smartifly! Your account is ready.');
        router.push('/');
      } else {
        toast.error(data.error || 'Registration failed');
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
        className="w-full max-w-[500px]"
      >
        <Card className="glass-card border-white/10 shadow-2xl overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-accent via-primary to-accent" />
          
          <CardHeader className="space-y-1 pt-8 text-center">
            <div className="mx-auto bg-accent/10 w-16 h-16 rounded-full flex items-center justify-center mb-4 border border-accent/20">
              <UserPlus className="w-8 h-8 text-accent" />
            </div>
            <CardTitle className="text-3xl font-bold tracking-tight">Create Account</CardTitle>
            <CardDescription className="text-foreground-secondary">
              Join Smartifly and start your premium streaming journey
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleRegister}>
            <CardContent className="space-y-4 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    placeholder="johndoe"
                    className="bg-background-input border-white/5 focus:border-accent/50"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    placeholder="John Doe"
                    className="bg-background-input border-white/5 focus:border-accent/50"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  className="bg-background-input border-white/5 focus:border-accent/50"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="bg-background-input border-white/5 focus:border-accent/50"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <p className="text-[10px] text-foreground-muted flex items-center mt-1">
                  <ShieldCheck className="w-3 h-3 mr-1 text-success" />
                  Passwords must be at least 6 characters
                </p>
              </div>
            </CardContent>
            
            <CardFooter className="flex flex-col gap-4 pb-8">
              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-accent to-accent-dark hover:shadow-glow-cyan text-accent-foreground transition-all duration-300" 
                disabled={isLoading}
              >
                {isLoading ? 'Creating account...' : 'Get Started'}
                {!isLoading && <ArrowRight className="ml-2 w-4 h-4" />}
              </Button>
              
              <div className="relative w-full text-center">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-white/5" />
                </div>
                <span className="relative bg-[#0B1220] px-2 text-xs text-foreground-muted uppercase tracking-widest">
                  Already have an account?
                </span>
              </div>
              
              <Link href="/login" className="w-full">
                <Button variant="outline" className="w-full border-white/10 hover:bg-white/5">
                  <LogIn className="mr-2 w-4 h-4" />
                  Sign In Instead
                </Button>
              </Link>
            </CardFooter>
          </form>
        </Card>
      </motion.div>

      {/* Decorative Elements */}
      <div className="absolute top-1/4 -right-20 w-64 h-64 bg-accent/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 -left-20 w-64 h-64 bg-primary/20 rounded-full blur-[100px] pointer-events-none" />
    </div>
  );
}
