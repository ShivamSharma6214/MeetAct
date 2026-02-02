import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/layout/Header';
import { FileDropzone } from '@/components/upload/FileDropzone';
import { TranscriptInput } from '@/components/upload/TranscriptInput';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Zap, Loader2, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Upload() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [meetingTitle, setMeetingTitle] = useState('');
  const [transcript, setTranscript] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    // Auto-populate title from filename
    if (!meetingTitle) {
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
      setMeetingTitle(nameWithoutExt);
    }
  };

  const processTranscript = async () => {
    if (!user) return;
    
    let transcriptText = transcript;
    let audioUrl: string | null = null;

    setIsProcessing(true);

    try {
      // If audio file, upload it and transcribe
      if (selectedFile && selectedFile.type.startsWith('audio/')) {
        // Upload to storage
        const filePath = `${user.id}/${Date.now()}-${selectedFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from('meeting-audio')
          .upload(filePath, selectedFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('meeting-audio')
          .getPublicUrl(filePath);
        
        audioUrl = urlData.publicUrl;

        // Call transcription edge function
        const { data: transcriptionData, error: transcriptionError } = await supabase.functions
          .invoke('transcribe-audio', {
            body: { audioUrl, filePath },
          });

        if (transcriptionError) throw transcriptionError;
        transcriptText = transcriptionData.transcript;
      } else if (selectedFile) {
        // Read text file
        transcriptText = await selectedFile.text();
      }

      if (!transcriptText.trim()) {
        toast({
          variant: 'destructive',
          title: 'No content',
          description: 'Please provide a transcript or upload a file.',
        });
        setIsProcessing(false);
        return;
      }

      // Create meeting record
      const { data: meeting, error: meetingError } = await supabase
        .from('meetings')
        .insert({
          user_id: user.id,
          title: meetingTitle || 'Untitled Meeting',
          transcript: transcriptText,
          audio_url: audioUrl,
          meeting_date: new Date().toISOString(),
        })
        .select()
        .single();

      if (meetingError) throw meetingError;

      // Call AI extraction edge function
      const { data: extractionData, error: extractionError } = await supabase.functions
        .invoke('extract-actions', {
          body: { 
            transcript: transcriptText,
            meetingId: meeting.id,
            meetingDate: meeting.meeting_date,
          },
        });

      if (extractionError) throw extractionError;

      // Update meeting as processed
      await supabase
        .from('meetings')
        .update({ processed_at: new Date().toISOString() })
        .eq('id', meeting.id);

      toast({
        title: 'Success!',
        description: `Extracted ${extractionData.actionItems?.length || 0} action items.`,
      });

      navigate(`/meeting/${meeting.id}`);
    } catch (error) {
      console.error('Processing error:', error);
      toast({
        variant: 'destructive',
        title: 'Processing failed',
        description: error instanceof Error ? error.message : 'An error occurred while processing.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const canProcess = (transcript.trim() || selectedFile) && !isProcessing;

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
      
      <main className="container max-w-3xl py-8">
        <Link
          to="/dashboard"
          className="mb-6 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Link>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              New Meeting
            </CardTitle>
            <CardDescription>
              Upload a transcript or audio file to extract action items automatically
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Meeting Title</Label>
              <Input
                id="title"
                placeholder="Q1 Planning Meeting"
                value={meetingTitle}
                onChange={(e) => setMeetingTitle(e.target.value)}
                disabled={isProcessing}
              />
            </div>

            <FileDropzone
              onFileSelect={handleFileSelect}
              isProcessing={isProcessing}
            />

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or</span>
              </div>
            </div>

            <TranscriptInput
              value={transcript}
              onChange={setTranscript}
              disabled={isProcessing}
            />

            <Button
              onClick={processTranscript}
              disabled={!canProcess}
              className="w-full"
              size="lg"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Zap className="mr-2 h-4 w-4" />
                  Extract Action Items
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
