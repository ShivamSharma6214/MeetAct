import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, AudioLines, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FileDropzoneProps {
  onFileSelect: (file: File) => void;
  isProcessing?: boolean;
  acceptedFileTypes?: string[];
}

const ACCEPTED_FILES = {
  'text/plain': ['.txt'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'audio/mpeg': ['.mp3'],
  'audio/wav': ['.wav'],
  'audio/x-m4a': ['.m4a'],
  'audio/mp4': ['.m4a'],
};

export function FileDropzone({ onFileSelect, isProcessing = false }: FileDropzoneProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setSelectedFile(file);
      onFileSelect(file);
    }
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: ACCEPTED_FILES,
    maxFiles: 1,
    maxSize: 104857600, // 100MB
    disabled: isProcessing,
  });

  const clearFile = () => {
    setSelectedFile(null);
  };

  const isAudio = selectedFile?.type.startsWith('audio/');
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={cn(
          'relative flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center transition-colors',
          isDragActive && 'border-primary bg-primary/5',
          isProcessing && 'cursor-not-allowed opacity-50',
          !isDragActive && !isProcessing && 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
        )}
      >
        <input {...getInputProps()} />
        
        {isProcessing ? (
          <div className="flex flex-col items-center">
            <Loader2 className="mb-4 h-12 w-12 animate-spin text-primary" />
            <p className="font-medium">Processing your file...</p>
            <p className="text-sm text-muted-foreground">
              {isAudio ? 'Transcribing audio and extracting action items' : 'Extracting action items'}
            </p>
          </div>
        ) : (
          <>
            <Upload className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="mb-2 font-medium">
              {isDragActive ? 'Drop your file here' : 'Drag & drop your file here'}
            </p>
            <p className="mb-4 text-sm text-muted-foreground">
              or click to browse
            </p>
            <div className="flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
              <span className="rounded bg-muted px-2 py-1">.txt</span>
              <span className="rounded bg-muted px-2 py-1">.doc</span>
              <span className="rounded bg-muted px-2 py-1">.docx</span>
              <span className="rounded bg-muted px-2 py-1">.mp3</span>
              <span className="rounded bg-muted px-2 py-1">.wav</span>
              <span className="rounded bg-muted px-2 py-1">.m4a</span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Max file size: 100MB</p>
          </>
        )}
      </div>

      {selectedFile && !isProcessing && (
        <div className="flex items-center gap-3 rounded-lg border bg-muted/50 p-3">
          {isAudio ? (
            <AudioLines className="h-8 w-8 text-primary" />
          ) : (
            <FileText className="h-8 w-8 text-primary" />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{selectedFile.name}</p>
            <p className="text-sm text-muted-foreground">
              {formatFileSize(selectedFile.size)}
              {isAudio && ' • Audio file will be transcribed'}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={clearFile}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {fileRejections.length > 0 && (
        <p className="text-sm text-destructive">
          {fileRejections[0].errors[0].code === 'file-too-large'
            ? 'File is too large. Maximum size is 100MB.'
            : 'Invalid file type. Please upload a text or audio file.'}
        </p>
      )}
    </div>
  );
}
