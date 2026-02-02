import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, ChevronRight, FileText } from 'lucide-react';
import { format } from 'date-fns';

interface Meeting {
  id: string;
  title: string;
  meeting_date: string;
  action_items_count: number;
  completed_count: number;
  open_count: number;
}

interface MeetingsListProps {
  meetings: Meeting[];
  isLoading?: boolean;
}

export function MeetingsList({ meetings, isLoading }: MeetingsListProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Meetings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4 rounded-lg border p-4">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-6 w-16" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (meetings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Meetings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <FileText className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <h3 className="mb-2 font-medium">No meetings yet</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Upload your first meeting transcript to get started
            </p>
            <Button asChild>
              <Link to="/upload">Upload Meeting</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Recent Meetings</CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/meetings">View All</Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {meetings.map((meeting) => (
          <Link
            key={meeting.id}
            to={`/meeting/${meeting.id}`}
            className="group flex items-center gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="truncate font-medium">{meeting.title}</h4>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                {format(new Date(meeting.meeting_date), 'MMM d, yyyy')}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {meeting.completed_count > 0 && (
                <Badge variant="secondary" className="bg-success/10 text-success">
                  {meeting.completed_count} done
                </Badge>
              )}
              {meeting.open_count > 0 && (
                <Badge variant="secondary">
                  {meeting.open_count} open
                </Badge>
              )}
              <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
