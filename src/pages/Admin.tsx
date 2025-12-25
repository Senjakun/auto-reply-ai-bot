import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Users, Palette, Settings, LogOut, Check, X, Trash2, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ThemeToggle } from '@/components/theme-toggle';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

interface UserWithRole {
  id: string;
  email: string | null;
  full_name: string | null;
  created_at: string;
  role: string;
}

interface ThemeSettings {
  primary_color: string;
  background_style: string;
  accent_color: string;
}

interface MusicSettings {
  music_url: string;
  music_enabled: boolean;
}

const Admin = () => {
  const { user, isAdmin, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [themeSettings, setThemeSettings] = useState<ThemeSettings>({
    primary_color: '270',
    background_style: 'gradient',
    accent_color: '200'
  });
  const [musicSettings, setMusicSettings] = useState<MusicSettings>({
    music_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    music_enabled: true
  });
  const [loadingUsers, setLoadingUsers] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    } else if (!loading && user && !isAdmin) {
      toast({
        title: 'Access Denied',
        description: 'You do not have admin privileges.',
        variant: 'destructive'
      });
      navigate('/');
    }
  }, [user, isAdmin, loading, navigate, toast]);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
      fetchThemeSettings();
      fetchMusicSettings();
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*');

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      const usersWithRoles = profiles?.map(profile => {
        const userRole = roles?.find(r => r.user_id === profile.id);
        return {
          ...profile,
          role: userRole?.role || 'user'
        };
      }) || [];

      setUsers(usersWithRoles);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchThemeSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('setting_value')
        .eq('setting_key', 'theme')
        .maybeSingle();

      if (error) throw error;
      
      if (data?.setting_value) {
        const settingValue = data.setting_value as Record<string, unknown>;
        setThemeSettings({
          primary_color: String(settingValue.primary_color || '270'),
          background_style: String(settingValue.background_style || 'gradient'),
          accent_color: String(settingValue.accent_color || '200')
        });
      }
    } catch (err) {
      console.error('Error fetching theme settings:', err);
    }
  };

  const fetchMusicSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('setting_value')
        .eq('setting_key', 'music')
        .maybeSingle();

      if (error) throw error;
      
      if (data?.setting_value) {
        const settingValue = data.setting_value as Record<string, unknown>;
        setMusicSettings({
          music_url: String(settingValue.music_url || 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'),
          music_enabled: settingValue.music_enabled !== false
        });
      }
    } catch (err) {
      console.error('Error fetching music settings:', err);
    }
  };

  const updateMusicSettings = async () => {
    try {
      // First check if music setting exists
      const { data: existing } = await supabase
        .from('site_settings')
        .select('id')
        .eq('setting_key', 'music')
        .maybeSingle();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('site_settings')
          .update({ 
            setting_value: {
              music_url: musicSettings.music_url,
              music_enabled: musicSettings.music_enabled
            },
            updated_at: new Date().toISOString(),
            updated_by: user?.id
          })
          .eq('setting_key', 'music');

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('site_settings')
          .insert({ 
            setting_key: 'music',
            setting_value: {
              music_url: musicSettings.music_url,
              music_enabled: musicSettings.music_enabled
            },
            updated_by: user?.id
          });

        if (error) throw error;
      }

      toast({
        title: 'Music Updated',
        description: 'Music settings have been saved. Refresh the page to hear changes.'
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to update music settings.',
        variant: 'destructive'
      });
    }
  };

  const updateThemeSettings = async () => {
    try {
      const settingValue = {
        primary_color: themeSettings.primary_color,
        background_style: themeSettings.background_style,
        accent_color: themeSettings.accent_color
      };
      
      const { error } = await supabase
        .from('site_settings')
        .update({ 
          setting_value: settingValue,
          updated_at: new Date().toISOString(),
          updated_by: user?.id
        })
        .eq('setting_key', 'theme');

      if (error) throw error;

      toast({
        title: 'Theme Updated',
        description: 'Theme settings have been saved.'
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to update theme settings.',
        variant: 'destructive'
      });
    }
  };

  const toggleUserRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole })
        .eq('user_id', userId);

      if (error) throw error;

      setUsers(users.map(u => 
        u.id === userId ? { ...u, role: newRole } : u
      ));

      toast({
        title: 'Role Updated',
        description: `User role changed to ${newRole}.`
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to update user role.',
        variant: 'destructive'
      });
    }
  };

  const deleteUser = async (userId: string) => {
    if (userId === user?.id) {
      toast({
        title: 'Error',
        description: 'You cannot delete your own account.',
        variant: 'destructive'
      });
      return;
    }

    try {
      // Delete from profiles (will cascade to user_roles)
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (error) throw error;

      setUsers(users.filter(u => u.id !== userId));

      toast({
        title: 'User Deleted',
        description: 'User has been removed from the system.'
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to delete user.',
        variant: 'destructive'
      });
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-16 w-16 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Background Effects */}
      <div className="fixed inset-0 bg-grid-pattern opacity-20" />
      <div className="fixed inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
      
      {/* Header */}
      <header className="relative z-10 border-b border-border bg-card/50 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            <span className="font-display text-2xl tracking-wide text-foreground">ADMIN PANEL</span>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Button variant="ghost" onClick={handleSignOut}>
              <LogOut className="h-5 w-5 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 container mx-auto px-4 py-8">
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="bg-card/50 backdrop-blur-xl border border-border">
            <TabsTrigger value="users" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Users className="h-4 w-4 mr-2" />
              Users
            </TabsTrigger>
            <TabsTrigger value="music" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Music className="h-4 w-4 mr-2" />
              Music
            </TabsTrigger>
            <TabsTrigger value="theme" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Palette className="h-4 w-4 mr-2" />
              Theme
            </TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card className="bg-card/50 backdrop-blur-xl border-primary/20">
              <CardHeader>
                <CardTitle className="font-display text-2xl flex items-center gap-2">
                  <Users className="h-6 w-6 text-primary" />
                  User Management
                </CardTitle>
                <CardDescription>Manage registered users and their access levels</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingUsers ? (
                  <p className="text-muted-foreground">Loading users...</p>
                ) : users.length === 0 ? (
                  <p className="text-muted-foreground">No users found.</p>
                ) : (
                  <div className="space-y-4">
                    {users.map((u) => (
                      <div 
                        key={u.id} 
                        className="flex items-center justify-between p-4 rounded-lg bg-background/50 border border-border"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-foreground">{u.email || 'No email'}</p>
                          <p className="text-sm text-muted-foreground">
                            {u.full_name || 'No name'} • Joined {new Date(u.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            u.role === 'admin' 
                              ? 'bg-primary/20 text-primary' 
                              : 'bg-muted text-muted-foreground'
                          }`}>
                            {u.role}
                          </span>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => toggleUserRole(u.id, u.role)}
                            disabled={u.id === user?.id}
                          >
                            {u.role === 'admin' ? (
                              <X className="h-4 w-4" />
                            ) : (
                              <Check className="h-4 w-4" />
                            )}
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => deleteUser(u.id)}
                            disabled={u.id === user?.id}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Music Tab */}
          <TabsContent value="music">
            <Card className="bg-card/50 backdrop-blur-xl border-primary/20">
              <CardHeader>
                <CardTitle className="font-display text-2xl flex items-center gap-2">
                  <Music className="h-6 w-6 text-primary" />
                  Background Music Settings
                </CardTitle>
                <CardDescription>Customize the background music for visitors</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Music URL (MP3 link)</Label>
                    <Input
                      type="url"
                      placeholder="https://example.com/music.mp3"
                      value={musicSettings.music_url}
                      onChange={(e) => setMusicSettings({ ...musicSettings, music_url: e.target.value })}
                      className="bg-background/50"
                    />
                    <p className="text-sm text-muted-foreground">
                      Masukkan URL ke file MP3. Bisa dari hosting sendiri atau layanan seperti SoundCloud, Google Drive, dll.
                    </p>
                  </div>

                  <div className="p-4 rounded-lg bg-background/50 border border-border">
                    <h4 className="font-medium text-foreground mb-2">Preview Music</h4>
                    <audio 
                      controls 
                      src={musicSettings.music_url} 
                      className="w-full"
                      preload="metadata"
                    />
                  </div>

                  <div className="p-4 rounded-lg bg-muted/50 border border-border">
                    <h4 className="font-medium text-foreground mb-2">💡 Tips</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Gunakan file MP3 dengan ukuran kecil (&lt; 5MB) untuk loading cepat</li>
                      <li>• Pilih musik ambient/lofi tanpa lirik untuk pengalaman terbaik</li>
                      <li>• Pastikan URL bisa diakses secara publik</li>
                    </ul>
                  </div>
                </div>

                <Button onClick={updateMusicSettings} className="w-full bg-primary hover:bg-primary/90">
                  Save Music Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Theme Tab */}
          <TabsContent value="theme">
            <Card className="bg-card/50 backdrop-blur-xl border-primary/20">
              <CardHeader>
                <CardTitle className="font-display text-2xl flex items-center gap-2">
                  <Palette className="h-6 w-6 text-primary" />
                  Theme Settings
                </CardTitle>
                <CardDescription>Customize the look and feel of your site</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Primary Color (Hue: {themeSettings.primary_color}°)</Label>
                    <Slider
                      value={[parseInt(themeSettings.primary_color)]}
                      onValueChange={(v) => setThemeSettings({ ...themeSettings, primary_color: v[0].toString() })}
                      max={360}
                      step={1}
                      className="w-full"
                    />
                    <div 
                      className="h-12 rounded-lg" 
                      style={{ backgroundColor: `hsl(${themeSettings.primary_color}, 80%, 60%)` }}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Accent Color (Hue: {themeSettings.accent_color}°)</Label>
                    <Slider
                      value={[parseInt(themeSettings.accent_color)]}
                      onValueChange={(v) => setThemeSettings({ ...themeSettings, accent_color: v[0].toString() })}
                      max={360}
                      step={1}
                      className="w-full"
                    />
                    <div 
                      className="h-12 rounded-lg" 
                      style={{ backgroundColor: `hsl(${themeSettings.accent_color}, 100%, 50%)` }}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Background Style</Label>
                    <Select 
                      value={themeSettings.background_style}
                      onValueChange={(v) => setThemeSettings({ ...themeSettings, background_style: v })}
                    >
                      <SelectTrigger className="bg-background/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gradient">Gradient</SelectItem>
                        <SelectItem value="solid">Solid</SelectItem>
                        <SelectItem value="animated">Animated</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button onClick={updateThemeSettings} className="w-full bg-primary hover:bg-primary/90">
                  Save Theme Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <Card className="bg-card/50 backdrop-blur-xl border-primary/20">
              <CardHeader>
                <CardTitle className="font-display text-2xl flex items-center gap-2">
                  <Settings className="h-6 w-6 text-primary" />
                  General Settings
                </CardTitle>
                <CardDescription>Configure general application settings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-background/50 border border-border">
                    <h4 className="font-medium text-foreground mb-2">Domain Configuration</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Your site is configured to run on VPS. Set your domain in the environment or reverse proxy configuration.
                    </p>
                    <code className="block p-3 rounded bg-muted text-sm font-mono">
                      VITE_SITE_URL=https://yourdomain.com
                    </code>
                  </div>

                  <div className="p-4 rounded-lg bg-background/50 border border-border">
                    <h4 className="font-medium text-foreground mb-2">Email Confirmation</h4>
                    <p className="text-sm text-muted-foreground">
                      Email confirmation is disabled for faster testing. Users can login immediately after registration.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;
