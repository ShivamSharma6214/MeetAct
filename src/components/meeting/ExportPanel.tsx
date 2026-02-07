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
  meetingId: string;
}

export function ExportPanel({ actionItems, selectedItems, meetingTitle, meetingId }: ExportPanelProps) {
  const { toast } = useToast();
  const [isExportingToJira, setIsExportingToJira] = useState(false);

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

  const exportToJira = async () => {
    setIsExportingToJira(true);

    try {
      const { data, error } = await supabase.functions.invoke('transcribe-audio', {
        body: {
          projectKey: 'YOUR_PROJECT_KEY',
          meetingId,
        },
      });

      if (error) throw error;

      if (data?.error) {
        toast({
          variant: 'destructive',
          title: 'Jira export failed',
          description: data.message || data.error,
        });
        return;
      }

      toast({
        title: 'Exported to Jira!',
        description: 'Tasks are being created in Jira.',
      });
    } catch (error) {
      console.error('Jira export error:', error);
      toast({
        variant: 'destructive',
        title: 'Jira export failed',
        description: error instanceof Error ? error.message : 'Failed to export tasks to Jira.',
      });
    } finally {
      setIsExportingToJira(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button onClick={exportToJira} disabled={isExportingToJira || itemsToExport.length === 0}>
        {isExportingToJira ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Send className="mr-2 h-4 w-4" />
        )}
        {isExportingToJira ? 'Creating Jira Tasks...' : 'Export to Jira'}
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
