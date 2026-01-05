import { useState, useEffect } from "react";
import { Link, Switch as RouteSwitch, Route, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  LayoutDashboard,
  FileText,
  Settings,
  Users,
  LogOut,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileCheck,
  ArrowRight,
  Download,
  Loader2,
  Plug,
  Shield,
  Key,
  Globe,
  Mail,
  Phone,
  Building2,
  UserPlus,
  Bell,
  Lock,
  Eye,
  Copy,
  ExternalLink,
  RefreshCw,
  CheckCircle,
  XCircle,
  Info,
  Zap,
  MessageSquare,
  FileWarning
} from "lucide-react";
import { useAuth, useSignOut } from "../hooks/useAuth";
import logo from "@assets/ClaimsIQ_Logo_02-09[31]_1767489942619.png";
import type { ProjectSummary, ChecklistItemWithTemplate, ProjectWithDetails } from "@shared/types";
import { formatDistanceToNow, format } from "date-fns";

// --- API Hooks ---
function useProjects() {
  return useQuery<ProjectSummary[]>({
    queryKey: ['portal', 'projects'],
    queryFn: async () => {
      const response = await fetch('/api/portal/projects', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch projects');
      const data = await response.json();
      return data.projects;
    },
  });
}

function useProject(projectId: string | null) {
  return useQuery<ProjectWithDetails>({
    queryKey: ['portal', 'project', projectId],
    queryFn: async () => {
      if (!projectId) throw new Error('No project ID');
      const response = await fetch(`/api/portal/projects/${projectId}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch project');
      const data = await response.json();
      return data.project;
    },
    enabled: !!projectId,
  });
}

function useChecklist(projectId: string | null) {
  return useQuery<ChecklistItemWithTemplate[]>({
    queryKey: ['portal', 'checklist', projectId],
    queryFn: async () => {
      if (!projectId) throw new Error('No project ID');
      const response = await fetch(`/api/portal/projects/${projectId}/checklist`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch checklist');
      const data = await response.json();
      return data.checklist;
    },
    enabled: !!projectId,
  });
}

function useUpdateChecklistItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId, status }: { itemId: string; status: string }) => {
      const response = await fetch(`/api/portal/checklist/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error('Failed to update checklist item');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal', 'checklist'] });
      queryClient.invalidateQueries({ queryKey: ['portal', 'projects'] });
    },
  });
}

function useActivity(projectId: string | null) {
  return useQuery({
    queryKey: ['portal', 'activity', projectId],
    queryFn: async () => {
      if (!projectId) throw new Error('No project ID');
      const response = await fetch(`/api/portal/projects/${projectId}/activity`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch activity');
      const data = await response.json();
      return data.activities;
    },
    enabled: !!projectId,
  });
}

// --- Helper Functions ---
function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    discovery_in_progress: 'Discovery',
    sow_pending: 'SOW Review',
    contract_signed: 'Contract Signed',
    onboarding: 'Onboarding',
    live: 'Live',
    churned: 'Churned',
  };
  return labels[status] || status;
}

function getChecklistProgress(items: ChecklistItemWithTemplate[]): number {
  if (!items.length) return 0;
  const completed = items.filter(i => i.status === 'complete').length;
  return Math.round((completed / items.length) * 100);
}

function getInitials(firstName?: string, lastName?: string): string {
  if (!firstName && !lastName) return '??';
  return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
}

// --- Layout Component ---
function PortalLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, isLoading } = useAuth();
  const signOut = useSignOut();

  const handleSignOut = () => {
    signOut.mutate();
  };

  const userName = user?.firstName && user?.lastName
    ? `${user.firstName} ${user.lastName}`
    : user?.email?.split('@')[0] || 'User';

  const initials = getInitials(user?.firstName, user?.lastName);

  return (
    <div className="min-h-screen bg-muted/20 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar text-sidebar-foreground flex-col hidden md:flex fixed h-full z-20">
        <div className="h-16 flex items-center px-6 border-b border-sidebar-border">
           <div className="flex items-center gap-2 font-bold text-lg text-sidebar-primary-foreground font-display">
             <img src={logo} alt="Claims iQ" className="h-6 w-6 object-contain" />
             <span>Claims iQ</span>
           </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <NavItem href="/portal" icon={LayoutDashboard} label="Dashboard" active={location === "/portal"} />
          <NavItem href="/portal/sow" icon={FileText} label="Documents" active={location === "/portal/sow"} />
          <NavItem href="/portal/integration" icon={Plug} label="Integration" active={location === "/portal/integration"} />
          <NavItem href="/portal/team" icon={Users} label="Team" active={location === "/portal/team"} />
          <NavItem href="/portal/settings" icon={Settings} label="Settings" active={location === "/portal/settings"} />
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9 border border-sidebar-border">
              <AvatarFallback>{isLoading ? '...' : initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {isLoading ? 'Loading...' : userName}
              </p>
              <p className="text-xs text-sidebar-foreground/70 truncate">
                {user?.email || ''}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-sidebar-foreground/50 hover:text-sidebar-foreground"
              onClick={handleSignOut}
              disabled={signOut.isPending}
            >
              {signOut.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-4 md:px-8 sticky top-0 z-10">
           <h1 className="text-xl font-semibold text-foreground font-display">
             {location === "/portal" ? "Dashboard" : location === "/portal/sow" ? "Statement of Work" : "Portal"}
           </h1>
           <div className="flex items-center gap-4">
              <Avatar className="h-8 w-8 md:hidden">
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
           </div>
        </header>
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

function NavItem({ href, icon: Icon, label, active }: { href: string; icon: React.ComponentType<{ className?: string }>; label: string; active?: boolean }) {
  return (
    <Link href={href}>
      <div className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
        active
          ? "bg-sidebar-primary text-sidebar-primary-foreground"
          : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      }`}>
        <Icon className="h-5 w-5" />
        {label}
      </div>
    </Link>
  );
}

// --- Dashboard Page ---
export function PortalDashboard() {
  const { data: projects, isLoading: projectsLoading, error: projectsError } = useProjects();

  // Get the first (most recent) project for this user
  const currentProject = projects?.[0];
  const projectId = currentProject?.id || null;

  const { data: checklist, isLoading: checklistLoading } = useChecklist(projectId);
  const { data: activities, isLoading: activitiesLoading } = useActivity(projectId);
  const updateChecklistItem = useUpdateChecklistItem();

  const isLoading = projectsLoading;
  const progress = checklist ? getChecklistProgress(checklist) : 0;

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <Skeleton className="h-48 w-full" />
        <div className="grid md:grid-cols-3 gap-6">
          <Skeleton className="h-64 md:col-span-2" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (projectsError) {
    return (
      <div className="max-w-5xl mx-auto">
        <Alert variant="destructive">
          <AlertDescription>Failed to load your projects. Please try again.</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!currentProject) {
    return (
      <div className="max-w-5xl mx-auto">
        <Card className="border-none shadow-md">
          <CardContent className="p-8 text-center">
            <h2 className="text-xl font-bold mb-2 font-display">No Active Projects</h2>
            <p className="text-muted-foreground mb-4">
              You don't have any onboarding projects yet. Please contact your Claims IQ representative.
            </p>
            <Button asChild>
              <a href="mailto:support@claimsiq.com">Contact Support</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleChecklistItemClick = async (item: ChecklistItemWithTemplate) => {
    if (item.status === 'complete') return;
    try {
      await updateChecklistItem.mutateAsync({
        itemId: item.id,
        status: 'complete',
      });
    } catch (error) {
      console.error('Failed to update checklist item:', error);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Progress Card */}
      <Card className="border-none shadow-md bg-gradient-to-r from-sidebar to-slate-900 text-white overflow-hidden relative">
         <div className="absolute top-0 right-0 p-32 bg-primary/20 rounded-full blur-3xl -mr-16 -mt-16"></div>
         <CardContent className="p-8 relative z-10">
           <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
             <div>
               <h2 className="text-2xl font-bold mb-1 font-display">
                 {currentProject.company?.legal_name || 'Your Project'}
               </h2>
               <p className="text-white/70">
                 Stage: <span className="text-accent font-medium">{getStatusLabel(currentProject.status)}</span>
               </p>
             </div>
             <div className="text-right">
               <div className="text-3xl font-bold font-mono">{progress}%</div>
               {currentProject.target_go_live_date && (
                 <div className="text-white/70 text-sm">
                   Target Go-Live: {format(new Date(currentProject.target_go_live_date), 'MMM d, yyyy')}
                 </div>
               )}
             </div>
           </div>
           <Progress value={progress} className="h-3 bg-white/20" />
           <div className="mt-6 flex gap-3">
             <Link href="/portal/sow">
                <Button variant="secondary" className="text-sidebar font-semibold">Review Documents</Button>
             </Link>
             <Button variant="outline" className="text-white border-white/20 hover:bg-white/10">Contact CSM</Button>
           </div>
         </CardContent>
      </Card>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Checklist */}
        <Card className="md:col-span-2 shadow-sm border-border">
          <CardHeader>
            <CardTitle className="font-display">Onboarding Checklist</CardTitle>
            <CardDescription>Tasks required to complete your setup.</CardDescription>
          </CardHeader>
          <CardContent>
            {checklistLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map(i => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : checklist && checklist.length > 0 ? (
              <div className="space-y-1">
                {checklist.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center p-3 hover:bg-muted/50 rounded-lg group cursor-pointer"
                    onClick={() => handleChecklistItemClick(item)}
                  >
                    <div className="mr-4">
                      {item.status === "complete" ? (
                        <CheckCircle2 className="text-green-500 h-5 w-5" />
                      ) : item.status === "in_progress" ? (
                        <Clock className="text-blue-500 h-5 w-5" />
                      ) : item.status === "blocked" ? (
                        <AlertCircle className="text-destructive h-5 w-5" />
                      ) : (
                        <div className="h-5 w-5 rounded-full border-2 border-border" />
                      )}
                    </div>
                    <div className={`flex-1 ${item.status === "complete" ? "line-through text-muted-foreground" : "font-medium text-foreground"}`}>
                      {item.template?.name || 'Task'}
                    </div>
                    <div className="text-sm text-muted-foreground mr-4 font-mono text-xs">
                      {item.completed_at
                        ? format(new Date(item.completed_at), 'MMM d')
                        : item.status === 'pending' ? 'Pending' : ''}
                    </div>
                    {item.status !== 'complete' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                        disabled={updateChecklistItem.isPending}
                      >
                        {updateChecklistItem.isPending ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          'Complete'
                        )}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">No checklist items yet.</p>
            )}
          </CardContent>
        </Card>

        {/* Activity Feed */}
        <Card className="shadow-sm border-border">
          <CardHeader>
            <CardTitle className="font-display">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {activitiesLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : activities && activities.length > 0 ? (
              <div className="space-y-6 relative border-l border-border ml-2 pl-6 pb-2">
                {activities.slice(0, 10).map((activity: { id: string; action: string; created_at: string; details?: Record<string, unknown> }) => (
                  <div key={activity.id} className="relative">
                     <div className="absolute -left-[31px] bg-card p-1">
                        <FileCheck className="h-4 w-4 text-muted-foreground" />
                     </div>
                     <p className="text-sm font-medium text-foreground">
                       {activity.action.replace(/_/g, ' ')}
                     </p>
                     <p className="text-xs text-muted-foreground font-mono">
                       {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                     </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">No recent activity.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// --- SOW Page ---
export function SOWPage() {
  const { data: projects, isLoading: projectsLoading } = useProjects();
  const currentProject = projects?.[0];
  const { data: project, isLoading: projectLoading } = useProject(currentProject?.id || null);
  const { toast } = useToast();
  const [showChangesModal, setShowChangesModal] = useState(false);
  const [changesNote, setChangesNote] = useState('');
  const [isApproving, setIsApproving] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const queryClient = useQueryClient();

  const isLoading = projectsLoading || projectLoading;

  const handleApproveSign = async () => {
    if (!project) return;
    setIsApproving(true);

    // Simulate API call - in production this would update the project status
    await new Promise(resolve => setTimeout(resolve, 1500));

    toast({
      title: "SOW Approved!",
      description: "Your Statement of Work has been approved. Our team will be in touch shortly.",
    });

    queryClient.invalidateQueries({ queryKey: ['portal', 'projects'] });
    setIsApproving(false);
  };

  const handleRequestChanges = async () => {
    if (!changesNote.trim()) {
      toast({
        title: "Please provide details",
        description: "Describe the changes you'd like to request.",
        variant: "destructive",
      });
      return;
    }

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    toast({
      title: "Change Request Submitted",
      description: "Your CSM will review your request and follow up within 24 hours.",
    });

    setShowChangesModal(false);
    setChangesNote('');
  };

  const handleDownloadPDF = async () => {
    if (!project) return;
    setIsDownloading(true);

    // Simulate PDF generation
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Create a simple text file as a placeholder (in production, this would be actual PDF generation)
    const content = `
STATEMENT OF WORK
=================

Project ID: ${project.id.slice(0, 8)}
Company: ${project.company?.legal_name || 'Company'}
Date: ${format(new Date(project.created_at), 'MMMM d, yyyy')}

SELECTED MODULES:
${project.module_selections?.filter(m => m.is_selected).map(m => `- ${m.module_type.toUpperCase()}`).join('\n') || '- None selected'}

IMPLEMENTATION TIMELINE:
- Week 1-2: Kickoff & Configuration
- Week 3-6: Integration
- Week 7-8: UAT & Sign-off

This document outlines the implementation services to be provided by Claims IQ Inc.
    `.trim();

    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ClaimsIQ_SOW_${project.id.slice(0, 8)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast({
      title: "Download Started",
      description: "Your SOW document is being downloaded.",
    });

    setIsDownloading(false);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col xl:flex-row gap-6 h-[calc(100vh-8rem)]">
        <Skeleton className="flex-1 h-full" />
        <div className="w-full xl:w-80 space-y-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="max-w-5xl mx-auto">
        <Alert>
          <AlertDescription>No project documents available yet.</AlertDescription>
        </Alert>
      </div>
    );
  }

  const companyName = project.company?.legal_name || 'Your Company';
  const selectedModules = project.module_selections
    ?.filter(m => m.is_selected)
    .map(m => m.module_type) || [];

  return (
    <div className="flex flex-col xl:flex-row gap-6 h-[calc(100vh-8rem)]">
       {/* Document Viewer */}
       <div className="flex-1 bg-muted/30 rounded-lg overflow-y-auto p-8 shadow-inner border border-border">
         <div className="max-w-[800px] mx-auto bg-white min-h-[1000px] shadow-lg p-12 md:p-16 text-slate-800">
            <div className="flex justify-between items-start mb-12">
               <div className="flex items-center gap-2 font-bold text-xl text-slate-900 font-display">
                  <img src={logo} alt="Claims iQ" className="h-8 w-8 object-contain" />
                  <span>Claims iQ</span>
               </div>
               <div className="text-right text-sm text-slate-500 font-mono">
                 <p>Project ID: {project.id.slice(0, 8)}</p>
                 <p>Date: {format(new Date(project.created_at), 'MMMM d, yyyy')}</p>
               </div>
            </div>

            <h1 className="text-3xl font-bold mb-8 text-center border-b pb-6 font-display">Statement of Work</h1>

            <div className="space-y-6 text-sm leading-relaxed">
               <section>
                 <h3 className="font-bold text-lg mb-2 text-slate-900 font-display">1. Executive Summary</h3>
                 <p>This Statement of Work ("SOW") outlines the implementation services to be provided by Claims IQ Inc. ("Provider") to {companyName} ("Client") for the deployment of the Claims IQ platform.</p>
               </section>

               <section>
                 <h3 className="font-bold text-lg mb-2 text-slate-900 font-display">2. Scope of Services</h3>
                 <p className="mb-2">The following modules will be provisioned:</p>
                 <ul className="list-disc pl-5 space-y-1">
                   {selectedModules.includes('core') && (
                     <li><strong>Core Intelligence Engine:</strong> Document processing and claims intelligence configuration.</li>
                   )}
                   {selectedModules.includes('comms') && (
                     <li><strong>Smart Communications:</strong> Automated customer communication workflows.</li>
                   )}
                   {selectedModules.includes('fnol') && (
                     <li><strong>Smart FNOL:</strong> First Notice of Loss intake portal configuration.</li>
                   )}
                 </ul>
               </section>

               <section>
                 <h3 className="font-bold text-lg mb-2 text-slate-900 font-display">3. Implementation Timeline</h3>
                 <table className="w-full border-collapse border border-slate-200 text-left mt-2">
                   <thead>
                     <tr className="bg-slate-50">
                       <th className="border p-2 font-display">Phase</th>
                       <th className="border p-2 font-display">Duration</th>
                       <th className="border p-2 font-display">Deliverable</th>
                     </tr>
                   </thead>
                   <tbody>
                     <tr>
                       <td className="border p-2">Kickoff & Config</td>
                       <td className="border p-2">Week 1-2</td>
                       <td className="border p-2">Environment Setup</td>
                     </tr>
                     <tr>
                       <td className="border p-2">Integration</td>
                       <td className="border p-2">Week 3-6</td>
                       <td className="border p-2">API Connectivity</td>
                     </tr>
                     <tr>
                       <td className="border p-2">UAT</td>
                       <td className="border p-2">Week 7-8</td>
                       <td className="border p-2">Sign-off</td>
                     </tr>
                   </tbody>
                 </table>
               </section>

               <div className="h-32"></div>

               <div className="flex justify-between mt-12 pt-8 border-t border-slate-200">
                  <div>
                    <div className="h-16 border-b border-slate-400 mb-2 w-48"></div>
                    <p className="font-bold">{companyName}</p>
                    <p className="text-xs text-slate-500">Authorized Signature</p>
                  </div>
                  <div>
                    <div className="h-16 border-b border-slate-400 mb-2 w-48"></div>
                    <p className="font-bold">Claims IQ Inc.</p>
                    <p className="text-xs text-slate-500">Authorized Signature</p>
                  </div>
               </div>
            </div>
         </div>
       </div>

       {/* Actions Sidebar */}
       <div className="w-full xl:w-80 space-y-4">
         <Card className="border-border">
           <CardHeader>
             <CardTitle className="text-lg font-display">Actions</CardTitle>
           </CardHeader>
           <CardContent className="space-y-3">
             <Button
               className="w-full"
               size="lg"
               onClick={handleApproveSign}
               disabled={isApproving}
             >
               {isApproving ? (
                 <>
                   <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                   Approving...
                 </>
               ) : (
                 <>
                   <CheckCircle className="h-4 w-4 mr-2" />
                   Approve & Sign
                 </>
               )}
             </Button>
             <Button
               variant="outline"
               className="w-full"
               onClick={() => setShowChangesModal(true)}
             >
               <FileWarning className="h-4 w-4 mr-2" />
               Request Changes
             </Button>
             <Button
               variant="ghost"
               className="w-full flex items-center gap-2"
               onClick={handleDownloadPDF}
               disabled={isDownloading}
             >
               {isDownloading ? (
                 <Loader2 className="h-4 w-4 animate-spin" />
               ) : (
                 <Download className="h-4 w-4" />
               )}
               {isDownloading ? 'Generating...' : 'Download PDF'}
             </Button>
           </CardContent>
         </Card>

         {/* Request Changes Modal */}
         {showChangesModal && (
           <Card className="border-border border-2 border-primary/20">
             <CardHeader>
               <CardTitle className="text-lg font-display">Request Changes</CardTitle>
               <CardDescription>Describe the changes you'd like to make to the SOW.</CardDescription>
             </CardHeader>
             <CardContent className="space-y-4">
               <textarea
                 className="w-full h-32 p-3 text-sm border rounded-md bg-background resize-none"
                 placeholder="Please describe the changes you'd like to request..."
                 value={changesNote}
                 onChange={(e) => setChangesNote(e.target.value)}
               />
               <div className="flex gap-2">
                 <Button
                   variant="outline"
                   className="flex-1"
                   onClick={() => {
                     setShowChangesModal(false);
                     setChangesNote('');
                   }}
                 >
                   Cancel
                 </Button>
                 <Button
                   className="flex-1"
                   onClick={handleRequestChanges}
                 >
                   Submit Request
                 </Button>
               </div>
             </CardContent>
           </Card>
         )}

         <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-lg font-display">Project Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <span className="font-medium">{getStatusLabel(project.status)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span className="font-mono text-xs">{format(new Date(project.created_at), 'MMM d, yyyy')}</span>
              </div>
              {project.target_go_live_date && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Target Go-Live</span>
                  <span className="font-mono text-xs">{format(new Date(project.target_go_live_date), 'MMM d, yyyy')}</span>
                </div>
              )}
            </CardContent>
         </Card>
       </div>
    </div>
  );
}

// --- Integration Page ---
export function IntegrationPage() {
  const { data: projects } = useProjects();
  const currentProject = projects?.[0];
  const { data: project, isLoading } = useProject(currentProject?.id || null);
  const { toast } = useToast();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    toast({ title: "Copied!", description: `${keyName} copied to clipboard` });
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // Demo API credentials (would be real in production)
  const apiCredentials = {
    clientId: `ciq_${currentProject?.id?.slice(0, 8) || 'demo'}_client`,
    apiKey: `sk_live_${currentProject?.id?.slice(0, 16) || 'demo1234567890'}...`,
    webhookSecret: `whsec_${currentProject?.id?.slice(0, 12) || 'webhook123'}...`,
  };

  const integrationStatus = {
    api: project?.status === 'live' ? 'connected' : 'pending',
    webhook: 'pending',
    sso: 'not_configured',
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-display">Integration Setup</h1>
        <p className="text-muted-foreground">Configure your Claims iQ API integration and connections.</p>
      </div>

      {/* Integration Status Overview */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className={`border-l-4 ${integrationStatus.api === 'connected' ? 'border-l-green-500' : 'border-l-amber-500'}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${integrationStatus.api === 'connected' ? 'bg-green-100' : 'bg-amber-100'}`}>
                  <Zap className={`h-5 w-5 ${integrationStatus.api === 'connected' ? 'text-green-600' : 'text-amber-600'}`} />
                </div>
                <div>
                  <p className="font-medium">API Connection</p>
                  <p className="text-sm text-muted-foreground capitalize">{integrationStatus.api.replace('_', ' ')}</p>
                </div>
              </div>
              {integrationStatus.api === 'connected' ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <Clock className="h-5 w-5 text-amber-500" />
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-100">
                  <RefreshCw className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="font-medium">Webhooks</p>
                  <p className="text-sm text-muted-foreground">Pending Setup</p>
                </div>
              </div>
              <Clock className="h-5 w-5 text-amber-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-slate-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-slate-100">
                  <Shield className="h-5 w-5 text-slate-600" />
                </div>
                <div>
                  <p className="font-medium">SSO</p>
                  <p className="text-sm text-muted-foreground">Not Configured</p>
                </div>
              </div>
              <XCircle className="h-5 w-5 text-slate-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* API Credentials */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            API Credentials
          </CardTitle>
          <CardDescription>Use these credentials to authenticate with the Claims iQ API.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Your API credentials are unique to your organization. Keep them secure and never share them publicly.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Client ID</Label>
              <div className="flex gap-2">
                <Input value={apiCredentials.clientId} readOnly className="font-mono bg-muted" />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(apiCredentials.clientId, 'Client ID')}
                >
                  {copiedKey === 'Client ID' ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>API Key (Live)</Label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Input value={apiCredentials.apiKey} readOnly className="font-mono bg-muted pr-10" type="password" />
                  <Eye className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(apiCredentials.apiKey, 'API Key')}
                >
                  {copiedKey === 'API Key' ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">This key will be fully revealed after your contract is signed.</p>
            </div>

            <div className="space-y-2">
              <Label>Webhook Secret</Label>
              <div className="flex gap-2">
                <Input value={apiCredentials.webhookSecret} readOnly className="font-mono bg-muted" type="password" />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(apiCredentials.webhookSecret, 'Webhook Secret')}
                >
                  {copiedKey === 'Webhook Secret' ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>

          <Separator />

          <div className="flex gap-3">
            <Button variant="outline" className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Regenerate Keys
            </Button>
            <Button variant="outline" className="flex items-center gap-2">
              <ExternalLink className="h-4 w-4" />
              View API Docs
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Webhook Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Webhook Configuration
          </CardTitle>
          <CardDescription>Configure webhooks to receive real-time notifications about claim events.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Webhook Endpoint URL</Label>
            <Input placeholder="https://your-domain.com/webhooks/claims-iq" />
            <p className="text-xs text-muted-foreground">We'll send POST requests to this URL when events occur.</p>
          </div>

          <div className="space-y-3">
            <Label>Event Subscriptions</Label>
            <div className="grid md:grid-cols-2 gap-3">
              {[
                { id: 'claim.created', label: 'Claim Created', desc: 'When a new claim is submitted' },
                { id: 'claim.updated', label: 'Claim Updated', desc: 'When claim details change' },
                { id: 'document.processed', label: 'Document Processed', desc: 'When AI finishes analyzing a document' },
                { id: 'status.changed', label: 'Status Changed', desc: 'When claim status updates' },
              ].map((event) => (
                <div key={event.id} className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50">
                  <Switch id={event.id} />
                  <div>
                    <Label htmlFor={event.id} className="font-medium cursor-pointer">{event.label}</Label>
                    <p className="text-xs text-muted-foreground">{event.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Button className="w-full md:w-auto">Save Webhook Configuration</Button>
        </CardContent>
      </Card>

      {/* Connected Systems */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plug className="h-5 w-5" />
            Connected Systems
          </CardTitle>
          <CardDescription>Your claims management and policy admin systems.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {project?.integration_configs && project.integration_configs.length > 0 ? (
              project.integration_configs.map((config) => (
                <div key={config.id} className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{config.system_name}</p>
                      <p className="text-sm text-muted-foreground">{config.system_type} - {config.connection_method || 'API'}</p>
                    </div>
                  </div>
                  <Badge variant="outline">Pending</Badge>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Plug className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No systems configured yet.</p>
                <p className="text-sm">Your CSM will help configure integrations during onboarding.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// --- Team Page ---
export function TeamPage() {
  const { user } = useAuth();
  const { data: projects } = useProjects();
  const currentProject = projects?.[0];
  const { data: project, isLoading } = useProject(currentProject?.id || null);

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const contacts = project?.contacts || [];
  const primaryContact = project?.primary_contact;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">Team Management</h1>
          <p className="text-muted-foreground">Manage your organization's team members and permissions.</p>
        </div>
        <Button className="flex items-center gap-2">
          <UserPlus className="h-4 w-4" />
          Invite Team Member
        </Button>
      </div>

      {/* Your Claims iQ Team */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Your Claims iQ Team
          </CardTitle>
          <CardDescription>Your dedicated Claims iQ implementation team.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-center gap-4 p-4 rounded-lg border bg-primary/5">
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-primary text-primary-foreground">CS</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-medium">Customer Success Manager</p>
                <p className="text-sm text-muted-foreground">Your primary point of contact</p>
                <div className="flex items-center gap-3 mt-2">
                  <Button variant="ghost" size="sm" className="h-7 px-2">
                    <Mail className="h-3 w-3 mr-1" /> Email
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 px-2">
                    <Phone className="h-3 w-3 mr-1" /> Call
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-lg border bg-muted/30">
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-secondary text-secondary-foreground">TS</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-medium">Technical Support</p>
                <p className="text-sm text-muted-foreground">Integration & API assistance</p>
                <div className="flex items-center gap-3 mt-2">
                  <Button variant="ghost" size="sm" className="h-7 px-2">
                    <MessageSquare className="h-3 w-3 mr-1" /> Chat
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Organization Members */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Organization Members
          </CardTitle>
          <CardDescription>People from your organization with portal access.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Primary Contact */}
            {primaryContact && (
              <div className="flex items-center justify-between p-4 rounded-lg border bg-accent/10">
                <div className="flex items-center gap-4">
                  <Avatar>
                    <AvatarFallback>
                      {primaryContact.first_name?.[0]}{primaryContact.last_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{primaryContact.first_name} {primaryContact.last_name}</p>
                      <Badge variant="secondary" className="text-xs">Primary</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{primaryContact.email}</p>
                    {primaryContact.title && (
                      <p className="text-xs text-muted-foreground">{primaryContact.title}</p>
                    )}
                  </div>
                </div>
                <Badge>Admin</Badge>
              </div>
            )}

            {/* Other Contacts */}
            {contacts.filter(c => c.id !== primaryContact?.id).map((contact) => (
              <div key={contact.id} className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50">
                <div className="flex items-center gap-4">
                  <Avatar>
                    <AvatarFallback>
                      {contact.first_name?.[0]}{contact.last_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{contact.first_name} {contact.last_name}</p>
                    <p className="text-sm text-muted-foreground">{contact.email}</p>
                    {contact.title && (
                      <p className="text-xs text-muted-foreground">{contact.title}</p>
                    )}
                  </div>
                </div>
                <Badge variant="outline">{contact.role}</Badge>
              </div>
            ))}

            {contacts.length === 0 && !primaryContact && (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No team members added yet.</p>
                <p className="text-sm">Invite your team members to collaborate on the onboarding process.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Pending Invitations
          </CardTitle>
          <CardDescription>Team members who haven't accepted their invitation yet.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50 text-green-500" />
            <p>No pending invitations.</p>
            <p className="text-sm">All invited team members have joined.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// --- Settings Page ---
export function SettingsPage() {
  const { user } = useAuth();
  const { data: projects } = useProjects();
  const currentProject = projects?.[0];
  const { data: project, isLoading } = useProject(currentProject?.id || null);
  const { toast } = useToast();

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const handleSave = () => {
    toast({ title: "Settings saved", description: "Your preferences have been updated." });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-display">Settings</h1>
        <p className="text-muted-foreground">Manage your account and project preferences.</p>
      </div>

      <Tabs defaultValue="account" className="space-y-6">
        <TabsList>
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
        </TabsList>

        {/* Account Tab */}
        <TabsContent value="account" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your personal information.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>First Name</Label>
                  <Input defaultValue={user?.firstName || ''} />
                </div>
                <div className="space-y-2">
                  <Label>Last Name</Label>
                  <Input defaultValue={user?.lastName || ''} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Email Address</Label>
                <Input defaultValue={user?.email || ''} disabled />
                <p className="text-xs text-muted-foreground">Contact support to change your email address.</p>
              </div>
              <Button onClick={handleSave}>Save Changes</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
              <CardDescription>Your organization details.</CardDescription>
            </CardHeader>
            <CardContent>
              {project?.company ? (
                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground text-xs">Legal Name</Label>
                      <p className="font-medium">{project.company.legal_name}</p>
                    </div>
                    {project.company.dba_name && (
                      <div>
                        <Label className="text-muted-foreground text-xs">DBA Name</Label>
                        <p className="font-medium">{project.company.dba_name}</p>
                      </div>
                    )}
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Address</Label>
                    <p className="font-medium">
                      {project.company.address_line_1}
                      {project.company.address_line_2 && `, ${project.company.address_line_2}`}
                    </p>
                    <p className="text-muted-foreground">
                      {project.company.city}, {project.company.state} {project.company.postal_code}
                    </p>
                  </div>
                  {project.company.website && (
                    <div>
                      <Label className="text-muted-foreground text-xs">Website</Label>
                      <p className="font-medium">
                        <a href={project.company.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                          {project.company.website}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </p>
                    </div>
                  )}
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      To update company information, please contact your Customer Success Manager.
                    </AlertDescription>
                  </Alert>
                </div>
              ) : (
                <p className="text-muted-foreground">Company information not available.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Email Notifications</CardTitle>
              <CardDescription>Choose what updates you receive via email.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { id: 'onboarding', label: 'Onboarding Updates', desc: 'Progress updates and milestone notifications' },
                { id: 'checklist', label: 'Checklist Reminders', desc: 'Reminders for pending checklist items' },
                { id: 'documents', label: 'Document Updates', desc: 'When documents need review or are approved' },
                { id: 'team', label: 'Team Activity', desc: 'When team members join or complete tasks' },
                { id: 'system', label: 'System Notifications', desc: 'Important system updates and maintenance' },
              ].map((notification) => (
                <div key={notification.id} className="flex items-center justify-between py-3 border-b last:border-0">
                  <div>
                    <p className="font-medium">{notification.label}</p>
                    <p className="text-sm text-muted-foreground">{notification.desc}</p>
                  </div>
                  <Switch defaultChecked={notification.id !== 'team'} />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notification Frequency</CardTitle>
              <CardDescription>How often you want to receive email digests.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { value: 'instant', label: 'Instant', desc: 'Get notified immediately' },
                  { value: 'daily', label: 'Daily Digest', desc: 'One email per day with all updates' },
                  { value: 'weekly', label: 'Weekly Summary', desc: 'One email per week' },
                ].map((option) => (
                  <div key={option.value} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                    <input type="radio" name="frequency" id={option.value} defaultChecked={option.value === 'instant'} />
                    <div>
                      <Label htmlFor={option.value} className="font-medium cursor-pointer">{option.label}</Label>
                      <p className="text-xs text-muted-foreground">{option.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Password
              </CardTitle>
              <CardDescription>Change your account password.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Current Password</Label>
                <Input type="password" />
              </div>
              <div className="space-y-2">
                <Label>New Password</Label>
                <Input type="password" />
              </div>
              <div className="space-y-2">
                <Label>Confirm New Password</Label>
                <Input type="password" />
              </div>
              <Button>Update Password</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Two-Factor Authentication
              </CardTitle>
              <CardDescription>Add an extra layer of security to your account.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                  <p className="font-medium">Authenticator App</p>
                  <p className="text-sm text-muted-foreground">Use an app like Google Authenticator or Authy</p>
                </div>
                <Button variant="outline">Enable</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Active Sessions</CardTitle>
              <CardDescription>Manage your active login sessions.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 rounded-lg border bg-accent/10">
                  <div className="flex items-center gap-3">
                    <Globe className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Current Session</p>
                      <p className="text-xs text-muted-foreground">Chrome on macOS - Active now</p>
                    </div>
                  </div>
                  <Badge variant="secondary">Current</Badge>
                </div>
              </div>
              <Button variant="outline" className="mt-4 text-destructive hover:text-destructive">
                Sign Out All Other Sessions
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Display Preferences</CardTitle>
              <CardDescription>Customize your portal experience.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b">
                <div>
                  <p className="font-medium">Compact View</p>
                  <p className="text-sm text-muted-foreground">Show more content with reduced spacing</p>
                </div>
                <Switch />
              </div>
              <div className="flex items-center justify-between py-3 border-b">
                <div>
                  <p className="font-medium">Show Progress Percentages</p>
                  <p className="text-sm text-muted-foreground">Display exact completion percentages</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium">Auto-refresh Dashboard</p>
                  <p className="text-sm text-muted-foreground">Automatically update dashboard data</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Timezone</CardTitle>
              <CardDescription>Set your preferred timezone for dates and times.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label>Timezone</Label>
                <select className="w-full p-2 border rounded-md bg-background">
                  <option value="America/New_York">Eastern Time (ET)</option>
                  <option value="America/Chicago">Central Time (CT)</option>
                  <option value="America/Denver">Mountain Time (MT)</option>
                  <option value="America/Los_Angeles">Pacific Time (PT)</option>
                </select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// --- Main Wrapper ---
export default function Portal() {
  const { isLoading, isFetching, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  // Redirect to login if not authenticated (use useEffect to avoid React render warnings)
  // Only redirect when not loading AND not fetching (to prevent race condition during auth refetch)
  useEffect(() => {
    if (!isLoading && !isFetching && !isAuthenticated) {
      setLocation('/login');
    }
  }, [isLoading, isFetching, isAuthenticated, setLocation]);

  // Show loading while checking auth or refetching
  if (isLoading || isFetching) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Don't render portal if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  return (
    <PortalLayout>
       <RouteSwitch>
          <Route path="/portal" component={PortalDashboard} />
          <Route path="/portal/sow" component={SOWPage} />
          <Route path="/portal/integration" component={IntegrationPage} />
          <Route path="/portal/team" component={TeamPage} />
          <Route path="/portal/settings" component={SettingsPage} />
       </RouteSwitch>
    </PortalLayout>
  );
}
