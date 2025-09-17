import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { OliveCard, OliveCardHeader, OliveCardContent, OliveCardTitle, OliveCardDescription } from '@/components/ui/olive-card';
import { OliveButton } from '@/components/ui/olive-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LanguageSwitcher } from '@/components/ui/language-switcher';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Leaf, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const loginSchema = z.object({
  email: z.string().email('validation.invalidEmail'),
  password: z.string().min(6, 'validation.minLength'),
});

const signupSchema = loginSchema.extend({
  firstname: z.string().min(2, 'validation.minLength'),
  lastname: z.string().min(2, 'validation.minLength'),
  phone: z.string().optional(),
  role: z.enum(['admin', 'operator', 'scanner'], {
    required_error: 'validation.roleRequired',
  }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'validation.passwordMismatch',
  path: ['confirmPassword'],
});

type LoginForm = z.infer<typeof loginSchema>;
type SignupForm = z.infer<typeof signupSchema>;

export const AuthPage: React.FC = () => {
  const { t } = useTranslation();
  const { user, loading, login, signup } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSignup, setIsSignup] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const signupForm = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      firstname: '',
      lastname: '',
      phone: '',
      role: 'operator',
    },
  });

  const handleLogin = async (data: LoginForm) => {
    const result = await login(data.email, data.password);
    
    if (result.success) {
      toast({
        title: t('common.success'),
        description: t('common.welcome'),
      });
      navigate('/dashboard');
    } else {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: t(result.error || 'auth.invalidCredentials'),
      });
    }
  };

  const handleSignup = async (data: SignupForm) => {
    const result = await signup({
      email: data.email,
      password: data.password,
      firstname: data.firstname,
      lastname: data.lastname,
      phone: data.phone,
      role: data.role,
    });

    if (result.success) {
      toast({
        title: t('common.success'),
        description: t('common.welcome'),
      });
      navigate('/dashboard');
    } else {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: t(result.error || 'auth.invalidCredentials'),
      });
    }
  };

  const fillDemoCredentials = () => {
    // Option no-op or prefill with example to speed manual testing
    loginForm.setValue('email', 'admin@example.com');
    loginForm.setValue('password', 'password12345');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/20 via-background to-secondary/20 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl olive-primary-gradient shadow-lg">
              <Leaf className="h-10 w-10 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {t('auth.title')}
          </h1>
          <p className="text-muted-foreground">
            {t('auth.subtitle')}
          </p>
        </div>

        {/* Language and Theme Switchers */}
        <div className="flex justify-between items-center">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>

        {/* Quick fill helper for testing */}
        {!isSignup && (
          <OliveCard variant="outlined">
            <OliveCardHeader>
              <OliveCardTitle className="text-lg">{t('auth.demoCredentials')}</OliveCardTitle>
              <OliveCardDescription>
                {t('auth.quickFill')}
              </OliveCardDescription>
            </OliveCardHeader>
            <OliveCardContent className="space-y-2">
              <OliveButton
                variant="ghost"
                size="sm"
                className="w-full justify-between"
                onClick={() => fillDemoCredentials()}
              >
                <span>admin@example.com</span>
                <span className="text-xs text-muted-foreground capitalize">
                  admin
                </span>
              </OliveButton>
            </OliveCardContent>
          </OliveCard>
        )}

        {/* Auth Form */}
        <OliveCard>
          <OliveCardContent className="pt-6">
            {!isSignup ? (
              <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">{t('auth.email')}</Label>
                  <Input
                    id="email"
                    type="email"
                    className="olive-input"
                    {...loginForm.register('email')}
                  />
                  {loginForm.formState.errors.email && (
                    <p className="text-sm text-destructive">
                      {t(loginForm.formState.errors.email.message!)}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">{t('auth.password')}</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      className="olive-input pr-10"
                      {...loginForm.register('password')}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {loginForm.formState.errors.password && (
                    <p className="text-sm text-destructive">
                      {t(loginForm.formState.errors.password.message!)}
                    </p>
                  )}
                </div>

                <OliveButton
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={loading}
                >
                  {loading ? t('common.loading') : t('auth.signin')}
                </OliveButton>
              </form>
            ) : (
              <form onSubmit={signupForm.handleSubmit(handleSignup)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstname">{t('auth.firstname')}</Label>
                    <Input
                      id="firstname"
                      className="olive-input"
                      {...signupForm.register('firstname')}
                    />
                    {signupForm.formState.errors.firstname && (
                      <p className="text-xs text-destructive">
                        {t(signupForm.formState.errors.firstname.message!)}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lastname">{t('auth.lastname')}</Label>
                    <Input
                      id="lastname"
                      className="olive-input"
                      {...signupForm.register('lastname')}
                    />
                    {signupForm.formState.errors.lastname && (
                      <p className="text-xs text-destructive">
                        {t(signupForm.formState.errors.lastname.message!)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-email">{t('auth.email')}</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    className="olive-input"
                    {...signupForm.register('email')}
                  />
                  {signupForm.formState.errors.email && (
                    <p className="text-sm text-destructive">
                      {t(signupForm.formState.errors.email.message!)}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">{t('auth.phone')}</Label>
                  <Input
                    id="phone"
                    type="tel"
                    className="olive-input"
                    {...signupForm.register('phone')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">{t('auth.role')}</Label>
                  <Select
                    value={signupForm.watch('role')}
                    onValueChange={(value) => signupForm.setValue('role', value as 'admin' | 'operator' | 'scanner')}
                  >
                    <SelectTrigger className="olive-input">
                      <SelectValue placeholder={t('auth.selectRole')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">{t('auth.roles.admin')}</SelectItem>
                      <SelectItem value="operator">{t('auth.roles.operator')}</SelectItem>
                      <SelectItem value="scanner">{t('auth.roles.scanner')}</SelectItem>
                    </SelectContent>
                  </Select>
                  {signupForm.formState.errors.role && (
                    <p className="text-sm text-destructive">
                      {t(signupForm.formState.errors.role.message!)}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password">{t('auth.password')}</Label>
                  <div className="relative">
                    <Input
                      id="signup-password"
                      type={showPassword ? 'text' : 'password'}
                      className="olive-input pr-10"
                      {...signupForm.register('password')}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {signupForm.formState.errors.password && (
                    <p className="text-sm text-destructive">
                      {t(signupForm.formState.errors.password.message!)}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">{t('auth.confirmPassword')}</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      className="olive-input pr-10"
                      {...signupForm.register('confirmPassword')}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {signupForm.formState.errors.confirmPassword && (
                    <p className="text-sm text-destructive">
                      {t(signupForm.formState.errors.confirmPassword.message!)}
                    </p>
                  )}
                </div>

                <OliveButton
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={loading}
                >
                  {loading ? t('common.loading') : t('auth.signup')}
                </OliveButton>
              </form>
            )}

            <div className="mt-6 text-center">
              <button
                type="button"
                className="text-sm text-primary hover:underline"
                onClick={() => setIsSignup(!isSignup)}
              >
                {isSignup ? t('auth.haveAccount') : t('auth.createAccount')}
              </button>
            </div>
          </OliveCardContent>
        </OliveCard>
      </div>
    </div>
  );
}

export default AuthPage;