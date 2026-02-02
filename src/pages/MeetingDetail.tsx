import { useState, useEffect, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/layout/Header';
import { ActionItemsTable } from '@/components/meeting/ActionItemsTable';
import { ExportPanel } from '@/components/meeting/ExportPanel';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Calendar, FileText, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

interface ActionItem {
  id: string;
  action_item: string;
  owner: string | null;
  owner_email: string | null;
  deadline: string | null;
  priority: 'Low' | 'Medium' | 'High';
  status: 'Open' | 'In Progress' | 'Done';
  confidence: number;
  notes: string | null;
  jira_issue_key: string | null;
}

interface Meeting {
  id: string;
  title: string;
  meeting_date: string;
  transcript: string | null;
  audio_url: string | null;
  processed_at: string | null;
}

export default function MeetingDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user && id) {
      fetchMeetingData();
      setupRealtimeSubscription();
    }
  }, [user, id]);

  const fetchMeetingData = async () => {
    if (!user || !id) return;

    try {
      // Fetch meeting
      const { data: meetingData, error: meetingError } = await supabase
        .from('meetings')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (meetingError) throw meetingError;
      setMeeting(meetingData);

      // Fetch action items
      const { data: itemsData, error: itemsError } = await supabase
        .from('action_items')
        .select('*')
        .eq('meeting_id', id)
        .order('created_at', { ascending: true });

      if (itemsError) throw itemsError;
      setActionItems(itemsData || []);
    } catch (error) {
      console.error('Error fetching meeting:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load meeting data.',
      });
      navigate('/dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    if (!id) return;

    const channel = supabase
      .channel(`action-items-${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'action_items',
          filter: `meeting_id=eq.${id}`,
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            setActionItems((prev) =>
              prev.map((item) =>
                item.id === payload.new.id ? (payload.new as ActionItem) : item
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setActionItems((prev) => prev.filter((item) => item.id !== payload.old.id));
          } else if (payload.eventType === 'INSERT') {
            setActionItems((prev) => [...prev, payload.new as ActionItem]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleUpdateItem = async (itemId: string, updates: Partial<ActionItem>) => {
    try {
      const { error } = await supabase
        .from('action_items')
        .update(updates)
        .eq('id', itemId);

      if (error) throw error;

      // Optimistic update
      setActionItems((prev) =>
        prev.map((item) => (item.id === itemId ? { ...item, ...updates } : item))
      );
    } catch (error) {
      console.error('Error updating item:', error);
      toast({
        variant: 'destructive',
        title: 'Update failed',
        description: 'Failed to update action item.',
      });
    }
  };

  const lowConfidenceCount = useMemo(
    () => actionItems.filter((item) => item.confidence < 0.7).length,
    [actionItems]
  );

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-8">
          <Skeleton className="mb-6 h-8 w-48" />
          <Skeleton className="mb-4 h-12 w-full" />
          <Skeleton className="h-96 w-full" />
        </main>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-8">
          <p>Meeting not found.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container py-8">
        <Link
          to="/dashboard"
          className="mb-6 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Link>

        {/* Meeting Header */}
        <div className="mb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold">{meeting.title}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(meeting.meeting_date), 'MMMM d, yyyy')}
                </span>
                <span className="flex items-center gap-1">
                  <FileText className="h-4 w-4" />
                  {actionItems.length} action items
                </span>
              </div>
            </div>
            <ExportPanel
              actionItems={actionItems}
              selectedItems={selectedItems}
              meetingTitle={meeting.title}
            />
          </div>

          {lowConfidenceCount > 0 && (
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-warning/50 bg-warning/10 p-3 text-sm">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <span>
                {lowConfidenceCount} item{lowConfidenceCount > 1 ? 's' : ''} flagged for manual
                review due to low confidence
              </span>
            </div>
          )}
        </div>

        {/* Action Items Table */}
        <Card>
          <CardHeader>
            <CardTitle>Action Items</CardTitle>
            <CardDescription>
              Review and edit the extracted action items. Click any field to edit inline.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ActionItemsTable
              items={actionItems}
              onUpdateItem={handleUpdateItem}
              selectedItems={selectedItems}
              onSelectionChange={setSelectedItems}
            />
          </CardContent>
        </Card>

        {/* Transcript Section */}
        {meeting.transcript && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Original Transcript</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-lg bg-muted p-4 font-mono text-sm">
                {meeting.transcript}
              </pre>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
