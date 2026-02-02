import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { Download, Send, FileJson, FileSpreadsheet, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

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

interface ExportPanelProps {
  actionItems: ActionItem[];
  selectedItems: string[];
  meetingTitle: string;
}

export function ExportPanel({ actionItems, selectedItems, meetingTitle }: ExportPanelProps) {
  const { toast } = useToast();
  const [isPushingToJira, setIsPushingToJira] = useState(false);

  const itemsToExport = selectedItems.length > 0
    ? actionItems.filter((item) => selectedItems.includes(item.id))
    : actionItems;

  const exportAsCSV = () => {
    const headers = ['Action Item', 'Owner', 'Email', 'Deadline', 'Priority', 'Status', 'Notes'];
    const rows = itemsToExport.map((item) => [
      `"${item.action_item.replace(/"/g, '""')}"`,
      `"${(item.owner || '').replace(/"/g, '""')}"`,
      item.owner_email || '',
      item.deadline || '',
      item.priority,
      item.status,
      `"${(item.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${meetingTitle.replace(/\s+/g, '_')}_actions.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: 'Exported!',
      description: `${itemsToExport.length} action items exported as CSV.`,
    });
  };

  const exportAsJSON = () => {
    const exportData = itemsToExport.map((item) => ({
      actionItem: item.action_item,
      owner: item.owner,
      ownerEmail: item.owner_email,
      deadline: item.deadline,
      priority: item.priority,
      status: item.status,
      notes: item.notes,
    }));

    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${meetingTitle.replace(/\s+/g, '_')}_actions.json`;
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: 'Exported!',
      description: `${itemsToExport.length} action items exported as JSON.`,
    });
  };

  const pushToJira = async () => {
    setIsPushingToJira(true);

    try {
      const { data, error } = await supabase.functions.invoke('push-to-jira', {
        body: {
          actionItems: itemsToExport.map((item) => ({
            id: item.id,
            summary: item.action_item,
            description: item.notes || '',
            assignee: item.owner_email,
            dueDate: item.deadline,
            priority: item.priority,
          })),
        },
      });

      if (error) throw error;

      toast({
        title: 'Pushed to Jira!',
        description: `${data.created?.length || 0} issues created in Jira.`,
      });
    } catch (error) {
      console.error('Jira push error:', error);
      toast({
        variant: 'destructive',
        title: 'Jira push failed',
        description: 'Make sure your Jira integration is connected in settings.',
      });
    } finally {
      setIsPushingToJira(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button onClick={pushToJira} disabled={isPushingToJira || itemsToExport.length === 0}>
        {isPushingToJira ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Send className="mr-2 h-4 w-4" />
        )}
        Push to Jira
        {selectedItems.length > 0 && ` (${selectedItems.length})`}
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" disabled={itemsToExport.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Export
            {selectedItems.length > 0 && ` (${selectedItems.length})`}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={exportAsCSV}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Export as CSV
          </DropdownMenuItem>
          <DropdownMenuItem onClick={exportAsJSON}>
            <FileJson className="mr-2 h-4 w-4" />
            Export as JSON
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
