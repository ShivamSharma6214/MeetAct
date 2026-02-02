import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, AlertTriangle, ExternalLink } from 'lucide-react';

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

interface ActionItemsTableProps {
  items: ActionItem[];
  onUpdateItem: (id: string, updates: Partial<ActionItem>) => Promise<void>;
  selectedItems: string[];
  onSelectionChange: (items: string[]) => void;
}

export function ActionItemsTable({
  items,
  onUpdateItem,
  selectedItems,
  onSelectionChange,
}: ActionItemsTableProps) {
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);

  const toggleSelectAll = () => {
    if (selectedItems.length === items.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(items.map((item) => item.id));
    }
  };

  const toggleSelect = (id: string) => {
    if (selectedItems.includes(id)) {
      onSelectionChange(selectedItems.filter((i) => i !== id));
    } else {
      onSelectionChange([...selectedItems, id]);
    }
  };

  const handleEdit = async (id: string, field: string, value: string | Date | null) => {
    let updates: Partial<ActionItem> = {};
    
    if (field === 'deadline' && value instanceof Date) {
      updates.deadline = value.toISOString();
    } else if (field === 'deadline' && value === null) {
      updates.deadline = null;
    } else {
      updates = { [field]: value };
    }
    
    await onUpdateItem(id, updates);
    setEditingCell(null);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High':
        return 'bg-priority-high/10 text-priority-high border-priority-high/30';
      case 'Medium':
        return 'bg-priority-medium/10 text-priority-medium border-priority-medium/30';
      case 'Low':
        return 'bg-priority-low/10 text-priority-low border-priority-low/30';
      default:
        return '';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Done':
        return 'bg-success/10 text-success border-success/30';
      case 'In Progress':
        return 'bg-primary/10 text-primary border-primary/30';
      case 'Open':
        return 'bg-muted text-muted-foreground';
      default:
        return '';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-confidence-high';
    if (confidence >= 0.7) return 'text-confidence-medium';
    return 'text-confidence-low';
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground">No action items found for this meeting.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                checked={selectedItems.length === items.length && items.length > 0}
                onCheckedChange={toggleSelectAll}
                aria-label="Select all"
              />
            </TableHead>
            <TableHead className="min-w-[250px]">Action Item</TableHead>
            <TableHead className="min-w-[120px]">Owner</TableHead>
            <TableHead className="min-w-[120px]">Deadline</TableHead>
            <TableHead className="w-24">Priority</TableHead>
            <TableHead className="w-28">Status</TableHead>
            <TableHead className="w-20">Confidence</TableHead>
            <TableHead className="w-20">Jira</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id} className={cn(item.confidence < 0.7 && 'bg-warning/5')}>
              <TableCell>
                <Checkbox
                  checked={selectedItems.includes(item.id)}
                  onCheckedChange={() => toggleSelect(item.id)}
                  aria-label={`Select ${item.action_item}`}
                />
              </TableCell>
              
              {/* Action Item */}
              <TableCell>
                {editingCell?.id === item.id && editingCell.field === 'action_item' ? (
                  <Input
                    defaultValue={item.action_item}
                    autoFocus
                    onBlur={(e) => handleEdit(item.id, 'action_item', e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleEdit(item.id, 'action_item', e.currentTarget.value);
                      } else if (e.key === 'Escape') {
                        setEditingCell(null);
                      }
                    }}
                  />
                ) : (
                  <div
                    className="cursor-pointer rounded px-2 py-1 hover:bg-muted"
                    onClick={() => setEditingCell({ id: item.id, field: 'action_item' })}
                  >
                    <p className="font-medium">{item.action_item}</p>
                    {item.notes && (
                      <p className="mt-1 text-xs text-muted-foreground">{item.notes}</p>
                    )}
                  </div>
                )}
              </TableCell>

              {/* Owner */}
              <TableCell>
                {editingCell?.id === item.id && editingCell.field === 'owner' ? (
                  <Input
                    defaultValue={item.owner || ''}
                    placeholder="Assign owner"
                    autoFocus
                    onBlur={(e) => handleEdit(item.id, 'owner', e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleEdit(item.id, 'owner', e.currentTarget.value);
                      } else if (e.key === 'Escape') {
                        setEditingCell(null);
                      }
                    }}
                  />
                ) : (
                  <div
                    className="cursor-pointer rounded px-2 py-1 hover:bg-muted"
                    onClick={() => setEditingCell({ id: item.id, field: 'owner' })}
                  >
                    {item.owner || (
                      <span className="text-muted-foreground">Unassigned</span>
                    )}
                    {item.owner_email && (
                      <p className="text-xs text-muted-foreground">{item.owner_email}</p>
                    )}
                  </div>
                )}
              </TableCell>

              {/* Deadline */}
              <TableCell>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      className={cn(
                        'w-full justify-start px-2 text-left font-normal',
                        !item.deadline && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {item.deadline
                        ? format(new Date(item.deadline), 'MMM d, yyyy')
                        : 'Set deadline'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={item.deadline ? new Date(item.deadline) : undefined}
                      onSelect={(date) => handleEdit(item.id, 'deadline', date || null)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </TableCell>

              {/* Priority */}
              <TableCell>
                <Select
                  value={item.priority}
                  onValueChange={(value) => handleEdit(item.id, 'priority', value)}
                >
                  <SelectTrigger className="h-8 w-24 border-0 bg-transparent p-0">
                    <Badge variant="outline" className={getPriorityColor(item.priority)}>
                      {item.priority}
                    </Badge>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>

              {/* Status */}
              <TableCell>
                <Select
                  value={item.status}
                  onValueChange={(value) => handleEdit(item.id, 'status', value)}
                >
                  <SelectTrigger className="h-8 w-28 border-0 bg-transparent p-0">
                    <Badge variant="outline" className={getStatusColor(item.status)}>
                      {item.status}
                    </Badge>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Open">Open</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Done">Done</SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>

              {/* Confidence */}
              <TableCell>
                <div className="flex items-center gap-1">
                  {item.confidence < 0.7 && (
                    <AlertTriangle className="h-4 w-4 text-warning" />
                  )}
                  <span className={cn('text-sm font-medium', getConfidenceColor(item.confidence))}>
                    {Math.round(item.confidence * 100)}%
                  </span>
                </div>
              </TableCell>

              {/* Jira */}
              <TableCell>
                {item.jira_issue_key ? (
                  <a
                    href={`https://atlassian.net/browse/${item.jira_issue_key}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    {item.jira_issue_key}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
