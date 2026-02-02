import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Header } from '@/components/layout/Header';
import {
  Zap,
  Clock,
  CheckCircle2,
  Users,
  ArrowRight,
  FileText,
  AudioLines,
  ListTodo,
  Send,
} from 'lucide-react';

const features = [
  {
    icon: FileText,
    title: 'Upload Any Format',
    description: 'Drop in transcripts (.txt, .doc) or audio files (.mp3, .wav). We handle the rest.',
  },
  {
    icon: Zap,
    title: 'AI-Powered Extraction',
    description: 'Our AI identifies action items, owners, deadlines, and priorities automatically.',
  },
  {
    icon: ListTodo,
    title: 'Smart Organization',
    description: 'Review, edit, and organize action items with confidence scores and inline editing.',
  },
  {
    icon: Send,
    title: 'Push to Jira',
    description: 'One-click export to Jira with automatic field mapping. No more copy-paste.',
  },
];

const stats = [
  { value: '75%', label: 'Less time on meeting notes' },
  { value: '4+ hrs', label: 'Saved per week' },
  { value: '<30s', label: 'Upload to Jira tasks' },
];

const workflow = [
  { step: 1, icon: AudioLines, title: 'Upload', description: 'Drop your meeting transcript or audio' },
  { step: 2, icon: Zap, title: 'Extract', description: 'AI identifies all action items instantly' },
  { step: 3, icon: CheckCircle2, title: 'Review', description: 'Edit and confirm extracted items' },
  { step: 4, icon: Send, title: 'Export', description: 'Push to Jira or download as CSV' },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="container py-24 sm:py-32">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-muted px-4 py-1.5 text-sm font-medium">
            <Zap className="h-4 w-4 text-primary" />
            <span>From meeting to action items in seconds</span>
          </div>
          
          <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-6xl">
            Turn Meetings into
            <span className="text-primary"> Action</span>
          </h1>
          
          <p className="mb-10 text-lg text-muted-foreground sm:text-xl">
            Stop wasting hours on meeting notes. MeetAct automatically extracts action items, 
            assigns owners, and syncs to Jira—so you can focus on execution.
          </p>
          
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Button size="lg" asChild>
              <Link to="/auth?mode=signup">
                Start Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/auth">Sign In</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-y bg-muted/50">
        <div className="container py-12">
          <div className="grid gap-8 sm:grid-cols-3">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-4xl font-bold text-primary">{stat.value}</div>
                <div className="mt-1 text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="container py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-bold">How It Works</h2>
          <p className="mb-12 text-muted-foreground">
            Four simple steps from meeting recording to tracked tasks
          </p>
        </div>
        
        <div className="mx-auto max-w-4xl">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {workflow.map((item) => (
              <div key={item.step} className="relative">
                <div className="flex flex-col items-center text-center">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <item.icon className="h-6 w-6" />
                  </div>
                  <div className="mb-1 text-sm font-medium text-muted-foreground">
                    Step {item.step}
                  </div>
                  <h3 className="mb-2 text-lg font-semibold">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="bg-muted/30 py-24">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="mb-4 text-3xl font-bold">Built for Product Managers</h2>
            <p className="mb-12 text-muted-foreground">
              Every feature designed to eliminate meeting overhead
            </p>
          </div>
          
          <div className="mx-auto grid max-w-5xl gap-6 sm:grid-cols-2">
            {features.map((feature) => (
              <Card key={feature.title} className="border-0 bg-background shadow-sm">
                <CardContent className="flex gap-4 p-6">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="mb-1 font-semibold">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container py-24">
        <div className="mx-auto max-w-3xl rounded-2xl bg-primary p-8 text-center text-primary-foreground sm:p-12">
          <Users className="mx-auto mb-6 h-12 w-12 opacity-90" />
          <h2 className="mb-4 text-2xl font-bold sm:text-3xl">
            Join PMs saving 4+ hours every week
          </h2>
          <p className="mb-8 opacity-90">
            Stop letting action items slip through the cracks. Start using MeetAct today.
          </p>
          <Button size="lg" variant="secondary" asChild>
            <Link to="/auth?mode=signup">
              Get Started Free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Zap className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold">MeetAct</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} MeetAct. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
