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

// Demo accounts type
type DemoAccount = {
  name: string;
  username: string;
  password: string;
  role: string;
};

const loginSchema = z.object({
  email: z.string().email('validation.invalidEmail'),
  password: z.string().min(6, 'validation.minLength'),
});

type LoginForm = z.infer<typeof loginSchema>;

export const AuthPage: React.FC = () => {
  const { t } = useTranslation();
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [demoAccounts, setDemoAccounts] = useState<DemoAccount[]>([]);

  // Helper function to get redirect path based on user role
  const getRedirectPath = (userRole: string) => {
    if (userRole === 'scanner') {
      return '/scanner';
    }
    if (userRole === 'operator') {
      return '/operator-scanner';
    }
    if (userRole === 'employee') {
      return '/employee-scanner';
    }
    if (userRole === 'queuer') {
      return '/queuer-scanner';
    }
    return '/';
  };

  // Load demo accounts
  useEffect(() => {
    const loadDemoAccounts = async () => {
      try {
        const response = await fetch('/accounts.json');
        if (response.ok) {
          const accounts = await response.json();
          setDemoAccounts(accounts);
        } else {
          console.log('Demo accounts file not found, hiding demo section');
          setDemoAccounts([]);
        }
      } catch (error) {
        console.log('Demo accounts file not found, hiding demo section');
        setDemoAccounts([]);
      }
    };
    loadDemoAccounts();
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      navigate(getRedirectPath(user.role));
    }
  }, [user, navigate]);

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });



  const handleLogin = async (data: LoginForm) => {
    const result = await login(data.email, data.password);
    
    if (result.success) {
      toast({
        title: t('common.success'),
        description: t('common.welcome'),
      });
      // Get the user from auth context to determine redirect path
      const currentUser = JSON.parse(localStorage.getItem('olive-mill-user') || '{}');
      navigate(getRedirectPath(currentUser.role || 'scanner'));
    } else {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: t(result.error || 'auth.invalidCredentials'),
      });
    }
  };



  const fillDemoCredentials = (account: DemoAccount) => {
    loginForm.setValue('email', account.username);
    loginForm.setValue('password', account.password);
  };  return (
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
        {demoAccounts.length > 0 && (
          <OliveCard variant="outlined">
            <OliveCardHeader>
              <OliveCardTitle className="text-lg">{t('auth.demoCredentials')}</OliveCardTitle>
              <OliveCardDescription>
                {t('auth.quickFill')}
              </OliveCardDescription>
            </OliveCardHeader>
            <OliveCardContent className="space-y-2">
              {demoAccounts.map((account, index) => (
                <OliveButton
                  key={index}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-between"
                  onClick={() => fillDemoCredentials(account)}
                >
                  <div className="flex flex-col items-start">
                    <span className="text-sm font-medium">{account.name}</span>
                    <span className="text-xs text-muted-foreground">{account.username}</span>
                  </div>
                  <span className="text-xs text-muted-foreground capitalize">
                    {account.role}
                  </span>
                </OliveButton>
              ))}
            </OliveCardContent>
          </OliveCard>
        )}

        {/* Auth Form */}
        <OliveCard>
          <OliveCardContent className="pt-6">
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
                    autoComplete="current-password"
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
          </OliveCardContent>
        </OliveCard>
      </div>
    </div>
  );
}

export default AuthPage;