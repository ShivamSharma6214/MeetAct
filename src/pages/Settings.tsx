import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Check, X, ExternalLink } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface JiraIntegration {
  id: string;
  cloud_id: string | null;
  access_token: string | null;
  expires_at: string | null;
}

export default function Settings() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [jiraIntegration, setJiraIntegration] = useState<JiraIntegration | null>(null);
  const [isLoadingIntegrations, setIsLoadingIntegrations] = useState(true);
  const [isConnectingJira, setIsConnectingJira] = useState(false);
  
  // Manual Jira connection form
  const [jiraDomain, setJiraDomain] = useState('');
  const [jiraEmail, setJiraEmail] = useState('');
  const [jiraApiToken, setJiraApiToken] = useState('');
  const [jiraProjectKey, setJiraProjectKey] = useState('');

  const normalizeDomain = (value: string) =>
    value
      .trim()
      .replace(/^https?:\/\//i, '')
      .replace(/\.atlassian\.net$/i, '')
      .replace(/\/+$/, '')
      .toLowerCase();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchIntegrations();
    }
  }, [user]);

  const fetchIntegrations = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('integrations')
        .select('*')
        .eq('user_id', user.id)
        .eq('service', 'jira')
        .maybeSingle();

      if (error) throw error;
      setJiraIntegration(data);
      
      if (data) {
        // Parse stored credentials if they exist
        try {
          const credentials = data.access_token ? JSON.parse(data.access_token) : null;
          if (credentials) {
            setJiraDomain(credentials.domain || '');
            setJiraEmail(credentials.email || '');
            setJiraProjectKey(credentials.projectKey || '');
          }
        } catch {
          // Not JSON, might be old format
        }
      }
    } catch (error) {
      console.error('Error fetching integrations:', error);
    } finally {
      setIsLoadingIntegrations(false);
    }
  };

  const connectJira = async () => {
    if (!user) return;

    const normalizedDomain = normalizeDomain(jiraDomain);
    const normalizedEmail = jiraEmail.trim().toLowerCase();
    const normalizedToken = jiraApiToken.trim();
    const normalizedProjectKey = jiraProjectKey.trim().toUpperCase();

    if (!normalizedDomain || !normalizedEmail || !normalizedToken || !normalizedProjectKey) {
      toast({
        variant: 'destructive',
        title: 'Missing fields',
        description: 'Please fill in all Jira connection fields.',
      });
      return;
    }

    setIsConnectingJira(true);

    try {
      const credentials = JSON.stringify({
        domain: normalizedDomain,
        email: normalizedEmail,
        apiToken: normalizedToken,
        projectKey: normalizedProjectKey,
      });

      const { data, error } = await supabase
        .from('integrations')
        .upsert(
          {
            user_id: user.id,
            service: 'jira',
            access_token: credentials,
            cloud_id: normalizedDomain,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,service' }
        )
        .select('*')
        .single();

      if (error) throw error;
      setJiraIntegration(data);
      setJiraDomain(normalizedDomain);
      setJiraEmail(normalizedEmail);
      setJiraProjectKey(normalizedProjectKey);

      toast({
        title: 'Jira connected!',
        description: 'You can now push action items to Jira.',
      });

      setJiraApiToken(''); // Clear the token from the form for security
    } catch (error) {
      console.error('Jira connection error:', error);
      toast({
        variant: 'destructive',
        title: 'Connection failed',
        description: error instanceof Error ? error.message : 'Failed to connect to Jira.',
      });
    } finally {
      setIsConnectingJira(false);
    }
  };

  const disconnectJira = async () => {
    if (!jiraIntegration) return;

    try {
      const { error } = await supabase
        .from('integrations')
        .delete()
        .eq('id', jiraIntegration.id);

      if (error) throw error;

      setJiraIntegration(null);
      setJiraDomain('');
      setJiraEmail('');
      setJiraApiToken('');
      setJiraProjectKey('');

      toast({
        title: 'Jira disconnected',
        description: 'Your Jira integration has been removed.',
      });
    } catch (error) {
      console.error('Error disconnecting Jira:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to disconnect Jira.',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container max-w-2xl py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">
            Manage your integrations and preferences.
          </p>
        </div>

        {/* Jira Integration */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900">
                  <svg viewBox="0 0 24 24" className="h-6 w-6 text-blue-600 dark:text-blue-400" fill="currentColor">
                    <path d="M11.53 2c0 2.4 1.97 4.35 4.35 4.35h1.78v1.7c0 2.4 1.94 4.34 4.34 4.35V2.84a.84.84 0 0 0-.84-.84h-9.63Zm-5.18 5.18c0 2.4 1.94 4.35 4.35 4.35h1.78v1.7c0 2.4 1.94 4.35 4.34 4.35V7.96a.84.84 0 0 0-.84-.84H6.35Zm-5.19 5.18c0 2.4 1.97 4.35 4.35 4.35h1.78v1.79c.02 2.39 1.96 4.34 4.35 4.34V13.2a.84.84 0 0 0-.84-.84H1.16Z"/>
                  </svg>
                </div>
                <div>
                  <CardTitle className="text-lg">Jira</CardTitle>
                  <CardDescription>
                    Push action items directly to your Jira projects
                  </CardDescription>
                </div>
              </div>
              {jiraIntegration && (
                <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                  <Check className="h-4 w-4" />
                  Connected
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoadingIntegrations ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <Alert>
                  <AlertDescription className="text-sm">
                    To connect Jira, you'll need an API token. 
                    <a 
                      href="https://id.atlassian.com/manage-profile/security/api-tokens" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="ml-1 inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      Create one here
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </AlertDescription>
                </Alert>

                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="jira-domain">Jira Domain</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="jira-domain"
                        placeholder="your-company"
                        value={jiraDomain}
                        onChange={(e) => setJiraDomain(e.target.value)}
                      />
                      <span className="text-sm text-muted-foreground whitespace-nowrap">.atlassian.net</span>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="jira-email">Jira Email</Label>
                    <Input
                      id="jira-email"
                      type="email"
                      placeholder="you@company.com"
                      value={jiraEmail}
                      onChange={(e) => setJiraEmail(e.target.value)}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="jira-token">API Token</Label>
                    <Input
                      id="jira-token"
                      type="password"
                      placeholder="••••••••••••••••"
                      value={jiraApiToken}
                      onChange={(e) => setJiraApiToken(e.target.value)}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="jira-project">Default Project Key</Label>
                    <Input
                      id="jira-project"
                      placeholder="PROJ"
                      value={jiraProjectKey}
                      onChange={(e) => setJiraProjectKey(e.target.value.toUpperCase())}
                    />
                    <p className="text-xs text-muted-foreground">
                      The project key where action items will be created (e.g., PROJ, DEV, TEAM)
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button 
                    onClick={connectJira} 
                    disabled={isConnectingJira}
                    className="flex-1"
                  >
                    {isConnectingJira ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    {jiraIntegration ? 'Update Connection' : 'Connect Jira'}
                  </Button>
                  {jiraIntegration && (
                    <Button 
                      variant="outline" 
                      onClick={disconnectJira}
                    >
                      <X className="mr-2 h-4 w-4" />
                      Disconnect
                    </Button>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
