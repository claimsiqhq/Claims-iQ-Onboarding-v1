import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useLocation } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import { useLogin, useVerifyOtp, useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '../components/ui/input-otp';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Loader2, Mail, ArrowLeft, Lock, Eye, EyeOff } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

const passwordLoginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;
type PasswordLoginFormData = z.infer<typeof passwordLoginSchema>;

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [authMethod, setAuthMethod] = useState<'magic_link' | 'password'>('magic_link');
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const loginMutation = useLogin();
  const verifyMutation = useVerifyOtp();

  const magicLinkForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const passwordForm = useForm<PasswordLoginFormData>({
    resolver: zodResolver(passwordLoginSchema),
  });

  // Password login mutation
  const passwordLoginMutation = useMutation({
    mutationFn: async (data: PasswordLoginFormData) => {
      const response = await fetch('/api/auth/login-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Login failed');
      }
      return result;
    },
    onSuccess: (result) => {
      if (result.requireMagicLink) {
        // Password verified but need magic link for full session
        setEmail(result.email);
        setAuthMethod('magic_link');
        loginMutation.mutate({ email: result.email });
        setStep('otp');
      } else {
        setLocation('/portal');
      }
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Login failed');
    },
  });

  // Redirect if already authenticated
  if (!authLoading && isAuthenticated) {
    setLocation('/portal');
    return null;
  }

  const onEmailSubmit = async (data: LoginFormData) => {
    setError(null);
    try {
      await loginMutation.mutateAsync({ email: data.email });
      setEmail(data.email);
      setStep('otp');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send magic link');
    }
  };

  const onPasswordSubmit = async (data: PasswordLoginFormData) => {
    setError(null);
    passwordLoginMutation.mutate(data);
  };

  const onOtpSubmit = async () => {
    if (otp.length < 6) {
      setError('Please enter the complete verification code');
      return;
    }

    setError(null);
    try {
      await verifyMutation.mutateAsync({ email, token: otp });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    }
  };

  const handleBackToEmail = () => {
    setStep('email');
    setOtp('');
    setError(null);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="text-center">
          <h1 className="text-3xl font-display font-bold text-primary">Claims IQ</h1>
          <p className="text-muted-foreground mt-2">Client Portal</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {step === 'email' ? 'Sign In' : 'Verify Your Email'}
            </CardTitle>
            <CardDescription>
              {step === 'email'
                ? "Choose your preferred sign-in method"
                : `We sent a verification code to ${email}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {step === 'email' ? (
              <Tabs value={authMethod} onValueChange={(v) => setAuthMethod(v as 'magic_link' | 'password')}>
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="magic_link">Magic Link</TabsTrigger>
                  <TabsTrigger value="password">Password</TabsTrigger>
                </TabsList>

                <TabsContent value="magic_link">
                  <form onSubmit={magicLinkForm.handleSubmit(onEmailSubmit)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email-magic">Email Address</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="email-magic"
                          type="email"
                          placeholder="you@company.com"
                          className="pl-10"
                          {...magicLinkForm.register('email')}
                        />
                      </div>
                      {magicLinkForm.formState.errors.email && (
                        <p className="text-sm text-destructive">{magicLinkForm.formState.errors.email.message}</p>
                      )}
                    </div>

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        'Send Magic Link'
                      )}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="password">
                  <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email-password">Email Address</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="email-password"
                          type="email"
                          placeholder="you@company.com"
                          className="pl-10"
                          {...passwordForm.register('email')}
                        />
                      </div>
                      {passwordForm.formState.errors.email && (
                        <p className="text-sm text-destructive">{passwordForm.formState.errors.email.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Enter your password"
                          className="pl-10 pr-10"
                          {...passwordForm.register('password')}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {passwordForm.formState.errors.password && (
                        <p className="text-sm text-destructive">{passwordForm.formState.errors.password.message}</p>
                      )}
                    </div>

                    <div className="text-right">
                      <Link href="/forgot-password" className="text-sm text-primary hover:underline">
                        Forgot password?
                      </Link>
                    </div>

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={passwordLoginMutation.isPending}
                    >
                      {passwordLoginMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Signing in...
                        </>
                      ) : (
                        'Sign In'
                      )}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Verification Code</Label>
                  <div className="flex justify-center">
                    <InputOTP
                      maxLength={6}
                      value={otp}
                      onChange={setOtp}
                    >
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                  <p className="text-sm text-muted-foreground text-center">
                    Check your email for the 6-digit code
                  </p>
                </div>

                <Button
                  type="button"
                  className="w-full"
                  onClick={onOtpSubmit}
                  disabled={verifyMutation.isPending || otp.length < 6}
                >
                  {verifyMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    'Verify & Sign In'
                  )}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={handleBackToEmail}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Use a different email
                </Button>

                <div className="text-center">
                  <Button
                    type="button"
                    variant="link"
                    onClick={() => onEmailSubmit({ email })}
                    disabled={loginMutation.isPending}
                  >
                    Resend code
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Help text */}
        <p className="text-center text-sm text-muted-foreground">
          Need help?{' '}
          <a href="mailto:support@claimsiq.com" className="text-primary hover:underline">
            Contact support
          </a>
        </p>
      </div>
    </div>
  );
}
