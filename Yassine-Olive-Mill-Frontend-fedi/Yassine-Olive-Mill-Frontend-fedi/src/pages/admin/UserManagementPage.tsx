import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { OliveCard, OliveCardHeader, OliveCardContent, OliveCardTitle, OliveCardDescription } from '@/components/ui/olive-card';
import { OliveButton } from '@/components/ui/olive-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/integrations/api/client';
import { Users, UserPlus, Edit2, Trash2, Eye, EyeOff, KeyRound } from 'lucide-react';

// User type
interface User {
  id: number;
  email: string;
  firstname?: string;
  lastname?: string;
  role: 'admin' | 'operator' | 'scanner' | 'employee' | 'queuer';
  createdAt: string;
  updatedAt: string;
}

// Form schemas
const createUserSchema = z.object({
  email: z.string().email('validation.invalidEmail'),
  password: z.string().min(6, 'validation.minLength'),
  confirmPassword: z.string(),
  firstname: z.string().min(2, 'validation.minLength'),
  lastname: z.string().min(2, 'validation.minLength'),
  role: z.enum(['admin', 'operator', 'scanner', 'employee', 'queuer'], {
    required_error: 'validation.roleRequired',
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'validation.passwordMismatch',
  path: ['confirmPassword'],
});

const editUserSchema = z.object({
  email: z.string().email('validation.invalidEmail'),
  firstname: z.string().min(2, 'validation.minLength'),
  lastname: z.string().min(2, 'validation.minLength'),
  role: z.enum(['admin', 'operator', 'scanner', 'employee', 'queuer'], {
    required_error: 'validation.roleRequired',
  }),
});

const changePasswordSchema = z.object({
  newPassword: z.string().min(6, 'validation.minLength'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'validation.passwordMismatch',
  path: ['confirmPassword'],
});

type CreateUserForm = z.infer<typeof createUserSchema>;
type EditUserForm = z.infer<typeof editUserSchema>;
type ChangePasswordForm = z.infer<typeof changePasswordSchema>;

export const UserManagementPage: React.FC = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [changingPasswordUser, setChangingPasswordUser] = useState<User | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  const createForm = useForm<CreateUserForm>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      firstname: '',
      lastname: '',
      role: 'scanner',
    },
  });

  const editForm = useForm<EditUserForm>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      email: '',
      firstname: '',
      lastname: '',
      role: 'scanner',
    },
  });

  const passwordForm = useForm<ChangePasswordForm>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      newPassword: '',
      confirmPassword: '',
    },
  });

  // Load users from API
  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/users');
      const userData = (response as any)?.data || response;
      
      if (Array.isArray(userData)) {
        setUsers(userData);
      } else if (userData?.users) {
        setUsers(userData.users);
      } else {
        setUsers([]);
      }
    } catch (error: any) {
      console.error('Error loading users:', error);
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: 'فشل في تحميل المستخدمين',
      });
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  // Load users on component mount
  useEffect(() => {
    loadUsers();
  }, []);

  // Handle create user
  const handleCreateUser = async (data: CreateUserForm) => {
    try {
      setLoading(true);
      
      const userPayload = {
        email: data.email,
        password: data.password,
        firstname: data.firstname,
        lastname: data.lastname,
        role: data.role,
      };

      await api.post('/auth/register', userPayload);
      
      toast({
        title: t('common.success'),
        description: 'تم إنشاء المستخدم بنجاح',
      });

      // Reset form and close dialog
      createForm.reset();
      setIsCreateDialogOpen(false);
      
      // Reload users
      await loadUsers();
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: error?.response?.data?.message || 'فشل في إنشاء المستخدم',
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle edit user
  const handleEditUser = async (data: EditUserForm) => {
    if (!editingUser) return;
    
    try {
      setLoading(true);
      
      await api.put(`/users/${editingUser.id}`, {
        email: data.email,
        firstname: data.firstname,
        lastname: data.lastname,
        role: data.role,
      });
      
      toast({
        title: t('common.success'),
        description: 'تم تحديث المستخدم بنجاح',
      });

      // Reset form and close dialog
      editForm.reset();
      setIsEditDialogOpen(false);
      setEditingUser(null);
      
      // Reload users
      await loadUsers();
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: error?.response?.data?.message || 'فشل في تحديث المستخدم',
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle delete user
  const handleDeleteUser = async (userId: number) => {
    if (!confirm('هل أنت متأكد من حذف هذا المستخدم؟')) return;
    
    try {
      setLoading(true);
      
      await api.delete(`/users/${userId}`);
      
      toast({
        title: t('common.success'),
        description: 'تم حذف المستخدم بنجاح',
      });
      
      // Reload users
      await loadUsers();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: error?.response?.data?.message || 'فشل في حذف المستخدم',
      });
    } finally {
      setLoading(false);
    }
  };

  // Open edit dialog
  const openEditDialog = (user: User) => {
    setEditingUser(user);
    editForm.reset({
      email: user.email,
      firstname: user.firstname || '',
      lastname: user.lastname || '',
      role: user.role,
    });
    setIsEditDialogOpen(true);
  };

  // Open password change dialog
  const openPasswordDialog = (user: User) => {
    setChangingPasswordUser(user);
    passwordForm.reset({
      newPassword: '',
      confirmPassword: '',
    });
    setIsPasswordDialogOpen(true);
  };

  // Handle change password
  const handleChangePassword = async (data: ChangePasswordForm) => {
    if (!changingPasswordUser) return;
    
    try {
      setLoading(true);
      
      await api.put(`/users/${changingPasswordUser.id}/password`, {
        password: data.newPassword,
      });
      
      toast({
        title: t('common.success'),
        description: 'تم تغيير كلمة المرور بنجاح',
      });

      // Reset form and close dialog
      passwordForm.reset();
      setIsPasswordDialogOpen(false);
      setChangingPasswordUser(null);
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: error?.response?.data?.message || 'فشل في تغيير كلمة المرور',
      });
    } finally {
      setLoading(false);
    }
  };

  // Get role badge variant
  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'operator': return 'default';
      case 'scanner': return 'secondary';
      case 'employee': return 'outline';
      case 'queuer': return 'secondary';
      default: return 'outline';
    }
  };

  // Get role translation
  const getRoleTranslation = (role: string) => {
    return t(`auth.roles.${role}`);
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            إدارة المستخدمين
          </h1>
          <p className="text-muted-foreground mt-2">
            إدارة حسابات المستخدمين وصلاحياتهم في النظام
          </p>
        </div>
        
        {/* Create User Button */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <OliveButton size="lg" className="gap-2">
              <UserPlus className="h-5 w-5" />
              إضافة مستخدم جديد
            </OliveButton>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>إضافة مستخدم جديد</DialogTitle>
            </DialogHeader>
            
            <form onSubmit={createForm.handleSubmit(handleCreateUser)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstname">الاسم الأول</Label>
                  <Input
                    id="firstname"
                    {...createForm.register('firstname')}
                    className="olive-input"
                  />
                  {createForm.formState.errors.firstname && (
                    <p className="text-xs text-destructive">
                      {t(createForm.formState.errors.firstname.message!)}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastname">الاسم الأخير</Label>
                  <Input
                    id="lastname"
                    {...createForm.register('lastname')}
                    className="olive-input"
                  />
                  {createForm.formState.errors.lastname && (
                    <p className="text-xs text-destructive">
                      {t(createForm.formState.errors.lastname.message!)}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <Input
                  id="email"
                  type="email"
                  {...createForm.register('email')}
                  className="olive-input"
                />
                {createForm.formState.errors.email && (
                  <p className="text-sm text-destructive">
                    {t(createForm.formState.errors.email.message!)}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">الدور</Label>
                <Select
                  value={createForm.watch('role')}
                  onValueChange={(value) => createForm.setValue('role', value as any)}
                >
                  <SelectTrigger className="olive-input">
                    <SelectValue placeholder="اختر الدور" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">{getRoleTranslation('admin')}</SelectItem>
                    <SelectItem value="operator">{getRoleTranslation('operator')}</SelectItem>
                    <SelectItem value="scanner">{getRoleTranslation('scanner')}</SelectItem>
                    <SelectItem value="employee">{getRoleTranslation('employee')}</SelectItem>
                    <SelectItem value="queuer">{getRoleTranslation('queuer')}</SelectItem>
                  </SelectContent>
                </Select>
                {createForm.formState.errors.role && (
                  <p className="text-sm text-destructive">
                    {t(createForm.formState.errors.role.message!)}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">كلمة المرور</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    {...createForm.register('password')}
                    className="olive-input pr-10"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {createForm.formState.errors.password && (
                  <p className="text-sm text-destructive">
                    {t(createForm.formState.errors.password.message!)}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">تأكيد كلمة المرور</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    {...createForm.register('confirmPassword')}
                    className="olive-input pr-10"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {createForm.formState.errors.confirmPassword && (
                  <p className="text-sm text-destructive">
                    {t(createForm.formState.errors.confirmPassword.message!)}
                  </p>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <OliveButton
                  type="submit"
                  className="flex-1"
                  disabled={loading}
                >
                  {loading ? t('common.loading') : 'إنشاء المستخدم'}
                </OliveButton>
                <OliveButton
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                  disabled={loading}
                >
                  إلغاء
                </OliveButton>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Users List */}
      <OliveCard>
        <OliveCardHeader>
          <OliveCardTitle>قائمة المستخدمين</OliveCardTitle>
          <OliveCardDescription>
            إجمالي المستخدمين: {users.length}
          </OliveCardDescription>
        </OliveCardHeader>
        <OliveCardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>لا يوجد مستخدمون في النظام</p>
            </div>
          ) : (
            <div className="space-y-4">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-foreground">
                        {user.firstname && user.lastname 
                          ? `${user.firstname} ${user.lastname}` 
                          : user.email}
                      </h3>
                      <Badge variant={getRoleBadgeVariant(user.role)}>
                        {getRoleTranslation(user.role)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    <p className="text-xs text-muted-foreground">
                      أنشئ في: {new Date(user.createdAt).toLocaleDateString('ar-TN')}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <OliveButton
                      size="sm"
                      variant="outline"
                      onClick={() => openEditDialog(user)}
                      className="gap-2"
                    >
                      <Edit2 className="h-4 w-4" />
                      تعديل
                    </OliveButton>
                    <OliveButton
                      size="sm"
                      variant="outline"
                      onClick={() => openPasswordDialog(user)}
                      className="gap-2"
                    >
                      <KeyRound className="h-4 w-4" />
                      كلمة المرور
                    </OliveButton>
                    <OliveButton
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteUser(user.id)}
                      className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      حذف
                    </OliveButton>
                  </div>
                </div>
              ))}
            </div>
          )}
        </OliveCardContent>
      </OliveCard>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>تعديل المستخدم</DialogTitle>
          </DialogHeader>
          
          {editingUser && (
            <form onSubmit={editForm.handleSubmit(handleEditUser)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-firstname">الاسم الأول</Label>
                  <Input
                    id="edit-firstname"
                    {...editForm.register('firstname')}
                    className="olive-input"
                  />
                  {editForm.formState.errors.firstname && (
                    <p className="text-xs text-destructive">
                      {t(editForm.formState.errors.firstname.message!)}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-lastname">الاسم الأخير</Label>
                  <Input
                    id="edit-lastname"
                    {...editForm.register('lastname')}
                    className="olive-input"
                  />
                  {editForm.formState.errors.lastname && (
                    <p className="text-xs text-destructive">
                      {t(editForm.formState.errors.lastname.message!)}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-email">البريد الإلكتروني</Label>
                <Input
                  id="edit-email"
                  type="email"
                  {...editForm.register('email')}
                  className="olive-input"
                />
                {editForm.formState.errors.email && (
                  <p className="text-sm text-destructive">
                    {t(editForm.formState.errors.email.message!)}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-role">الدور</Label>
                <Select
                  value={editForm.watch('role')}
                  onValueChange={(value) => editForm.setValue('role', value as any)}
                >
                  <SelectTrigger className="olive-input">
                    <SelectValue placeholder="اختر الدور" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">{getRoleTranslation('admin')}</SelectItem>
                    <SelectItem value="operator">{getRoleTranslation('operator')}</SelectItem>
                    <SelectItem value="scanner">{getRoleTranslation('scanner')}</SelectItem>
                    <SelectItem value="employee">{getRoleTranslation('employee')}</SelectItem>
                    <SelectItem value="queuer">{getRoleTranslation('queuer')}</SelectItem>
                  </SelectContent>
                </Select>
                {editForm.formState.errors.role && (
                  <p className="text-sm text-destructive">
                    {t(editForm.formState.errors.role.message!)}
                  </p>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <OliveButton
                  type="submit"
                  className="flex-1"
                  disabled={loading}
                >
                  {loading ? t('common.loading') : 'حفظ التغييرات'}
                </OliveButton>
                <OliveButton
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditDialogOpen(false);
                    setEditingUser(null);
                  }}
                  disabled={loading}
                >
                  إلغاء
                </OliveButton>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>تغيير كلمة المرور</DialogTitle>
          </DialogHeader>
          
          {changingPasswordUser && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">تغيير كلمة المرور لـ:</p>
                <p className="font-semibold">
                  {changingPasswordUser.firstname && changingPasswordUser.lastname 
                    ? `${changingPasswordUser.firstname} ${changingPasswordUser.lastname}` 
                    : changingPasswordUser.email}
                </p>
              </div>

              <form onSubmit={passwordForm.handleSubmit(handleChangePassword)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">كلمة المرور الجديدة</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNewPassword ? 'text' : 'password'}
                      {...passwordForm.register('newPassword')}
                      className="olive-input pr-10"
                      placeholder="أدخل كلمة المرور الجديدة"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {passwordForm.formState.errors.newPassword && (
                    <p className="text-sm text-destructive">
                      {t(passwordForm.formState.errors.newPassword.message!)}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">تأكيد كلمة المرور</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmNewPassword ? 'text' : 'password'}
                      {...passwordForm.register('confirmPassword')}
                      className="olive-input pr-10"
                      placeholder="أعد إدخال كلمة المرور"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                    >
                      {showConfirmNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {passwordForm.formState.errors.confirmPassword && (
                    <p className="text-sm text-destructive">
                      {t(passwordForm.formState.errors.confirmPassword.message!)}
                    </p>
                  )}
                </div>

                <div className="flex gap-3 pt-4">
                  <OliveButton
                    type="submit"
                    className="flex-1"
                    disabled={loading}
                  >
                    {loading ? t('common.loading') : 'تغيير كلمة المرور'}
                  </OliveButton>
                  <OliveButton
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsPasswordDialogOpen(false);
                      setChangingPasswordUser(null);
                      passwordForm.reset();
                    }}
                    disabled={loading}
                  >
                    إلغاء
                  </OliveButton>
                </div>
              </form>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
