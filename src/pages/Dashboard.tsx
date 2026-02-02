import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/layout/Header';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { MeetingsList } from '@/components/dashboard/MeetingsList';
import { Button } from '@/components/ui/button';
import { Clock, CheckCircle2, ListTodo, Plus } from 'lucide-react';

interface MeetingWithCounts {
  id: string;
  title: string;
  meeting_date: string;
  action_items_count: number;
  completed_count: number;
  open_count: number;
}

export default function Dashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState<MeetingWithCounts[]>([]);
  const [stats, setStats] = useState({
    timeSaved: 0,
    actionsCompleted: 0,
    openItems: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user) return;

    try {
      // Fetch meetings with action item counts
      const { data: meetingsData, error: meetingsError } = await supabase
        .from('meetings')
        .select(`
          id,
          title,
          meeting_date,
          action_items (
            id,
            status
          )
        `)
        .eq('user_id', user.id)
        .order('meeting_date', { ascending: false })
        .limit(5);

      if (meetingsError) throw meetingsError;

      const formattedMeetings: MeetingWithCounts[] = (meetingsData || []).map((meeting) => {
        const actionItems = meeting.action_items || [];
        return {
          id: meeting.id,
          title: meeting.title,
          meeting_date: meeting.meeting_date,
          action_items_count: actionItems.length,
          completed_count: actionItems.filter((a: { status: string }) => a.status === 'Done').length,
          open_count: actionItems.filter((a: { status: string }) => a.status !== 'Done').length,
        };
      });

      setMeetings(formattedMeetings);

      // Fetch overall stats
      const { data: allActions, error: actionsError } = await supabase
        .from('action_items')
        .select('status')
        .eq('user_id', user.id);

      if (actionsError) throw actionsError;

      const completed = (allActions || []).filter((a) => a.status === 'Done').length;
      const open = (allActions || []).filter((a) => a.status !== 'Done').length;

      // Fetch analytics for time saved
      const { data: analyticsData } = await supabase
        .from('analytics')
        .select('time_saved_minutes')
        .eq('user_id', user.id)
        .order('week_start', { ascending: false })
        .limit(1)
        .single();

      setStats({
        timeSaved: analyticsData?.time_saved_minutes || (meetingsData?.length || 0) * 15,
        actionsCompleted: completed,
        openItems: open,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const formatTimeSaved = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours} hrs`;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container py-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back! Here's your meeting overview.
            </p>
          </div>
          <Button asChild size="lg">
            <Link to="/upload">
              <Plus className="mr-2 h-4 w-4" />
              New Meeting
            </Link>
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <StatsCard
            title="Time Saved"
            value={formatTimeSaved(stats.timeSaved)}
            description="This week"
            icon={Clock}
            trend="up"
          />
          <StatsCard
            title="Actions Completed"
            value={stats.actionsCompleted}
            description={`${stats.actionsCompleted + stats.openItems} total`}
            icon={CheckCircle2}
          />
          <StatsCard
            title="Open Items"
            value={stats.openItems}
            description="Pending actions"
            icon={ListTodo}
            trend={stats.openItems > 5 ? 'down' : 'neutral'}
          />
        </div>

        {/* Recent Meetings */}
        <MeetingsList meetings={meetings} isLoading={isLoading} />
      </main>
    </div>
  );
}
