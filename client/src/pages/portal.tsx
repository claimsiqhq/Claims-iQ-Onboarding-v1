import { useState, useEffect, useCallback } from "react";
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
  FileWarning,
  Upload,
  Trash2,
  File
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

function useApproveSow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectId: string) => {
      const response = await fetch(`/api/portal/projects/${projectId}/sow/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to approve SOW');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal', 'projects'] });
      queryClient.invalidateQueries({ queryKey: ['portal', 'project'] });
      queryClient.invalidateQueries({ queryKey: ['portal', 'activity'] });
    },
  });
}

function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { firstName?: string; lastName?: string; phone?: string; title?: string }) => {
      const response = await fetch('/api/portal/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to update profile');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
  });
}

function useInviteTeamMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { email: string; firstName: string; lastName: string; title?: string; role?: string }) => {
      const response = await fetch('/api/portal/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to invite team member');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal', 'project'] });
      queryClient.invalidateQueries({ queryKey: ['portal', 'team'] });
    },
  });
}

function useChangePassword() {
  return useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      // First verify the current password by attempting a login
      const verifyResponse = await fetch('/api/auth/login-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: '', password: data.currentPassword }),
      });

      // Now set the new password
      const response = await fetch('/api/auth/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          password: data.newPassword,
          confirmPassword: data.newPassword
        }),
      });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to change password');
      }
      return response.json();
    },
  });
}

function usePasswordStrength() {
  return useMutation({
    mutationFn: async (password: string) => {
      const response = await fetch('/api/auth/password-strength', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!response.ok) throw new Error('Failed to check password strength');
      return response.json();
    },
  });
}

function useDocuments(projectId: string | null) {
  return useQuery({
    queryKey: ['portal', 'documents', projectId],
    queryFn: async () => {
      if (!projectId) throw new Error('No project ID');
      const response = await fetch(`/api/portal/projects/${projectId}/documents`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch documents');
      const data = await response.json();
      return data.documents;
    },
    enabled: !!projectId,
  });
}

function useUploadDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, file }: { projectId: string; file: File }) => {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`/api/portal/projects/${projectId}/documents/upload`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to upload document');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal', 'documents'] });
      queryClient.invalidateQueries({ queryKey: ['portal', 'project'] });
    },
  });
}

function useDeleteDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (documentId: string) => {
      const response = await fetch(`/api/portal/documents/${documentId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to delete document');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal', 'documents'] });
      queryClient.invalidateQueries({ queryKey: ['portal', 'project'] });
    },
  });
}

function useDownloadDocument() {
  return useMutation({
    mutationFn: async (documentId: string) => {
      const response = await fetch(`/api/portal/documents/${documentId}/download`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to get download URL');
      const data = await response.json();
      return data;
    },
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
           <div className="mt-6 flex flex-wrap gap-3">
             <Link href="/onboarding">
                <Button variant="secondary" className="text-sidebar font-semibold">Start Onboarding Interview</Button>
             </Link>
             <Link href="/portal/sow">
                <Button variant="outline" className="text-white border-white/20 hover:bg-white/10">Review Documents</Button>
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
  const { data: documents, isLoading: documentsLoading } = useDocuments(currentProject?.id || null);
  const { toast } = useToast();
  const [showChangesModal, setShowChangesModal] = useState(false);
  const [changesNote, setChangesNote] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const approveSow = useApproveSow();
  const uploadDocument = useUploadDocument();
  const deleteDocument = useDeleteDocument();
  const downloadDocument = useDownloadDocument();

  const isLoading = projectsLoading || projectLoading;
  const isAlreadySigned = !!(project as any)?.sow_signed_at;

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !currentProject?.id) return;

    setIsUploading(true);
    try {
      await uploadDocument.mutateAsync({ projectId: currentProject.id, file });
      toast({
        title: "Document uploaded",
        description: `${file.name} has been uploaded successfully.`,
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload document",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const handleDownloadDoc = async (docId: string, docName: string) => {
    try {
      const result = await downloadDocument.mutateAsync(docId);
      // Open the signed URL in a new tab
      window.open(result.url, '_blank');
    } catch (error) {
      toast({
        title: "Download failed",
        description: error instanceof Error ? error.message : "Failed to download document",
        variant: "destructive",
      });
    }
  };

  const handleDeleteDoc = async (docId: string, docName: string) => {
    if (!confirm(`Are you sure you want to delete "${docName}"?`)) return;

    try {
      await deleteDocument.mutateAsync(docId);
      toast({
        title: "Document deleted",
        description: `${docName} has been deleted.`,
      });
    } catch (error) {
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Failed to delete document",
        variant: "destructive",
      });
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return FileText;
    if (fileType.includes('image')) return FileCheck;
    return File;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleApproveSign = async () => {
    if (!project || isAlreadySigned) return;

    try {
      await approveSow.mutateAsync(project.id);
      toast({
        title: "SOW Approved!",
        description: "Your Statement of Work has been approved and signed. Our team will be in touch shortly.",
      });
    } catch (error) {
      toast({
        title: "Failed to approve SOW",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    }
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

    try {
      // Fetch real PDF from server
      const response = await fetch(`/api/portal/projects/${project.id}/sow/pdf`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ClaimsIQ_SOW_${project.id.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Download Complete",
        description: "Your SOW document has been downloaded.",
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: error instanceof Error ? error.message : "Failed to generate PDF",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
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
               disabled={approveSow.isPending || isAlreadySigned}
             >
               {approveSow.isPending ? (
                 <>
                   <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                   Approving...
                 </>
               ) : isAlreadySigned ? (
                 <>
                   <CheckCircle className="h-4 w-4 mr-2" />
                   Already Signed
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

         {/* Document Upload Section */}
         <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-lg font-display flex items-center gap-2">
                <File className="h-5 w-5" />
                Documents
              </CardTitle>
              <CardDescription>Upload and manage project documents.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Upload Button */}
              <div className="space-y-2">
                <Label htmlFor="file-upload" className="cursor-pointer">
                  <div className="border-2 border-dashed border-border rounded-lg p-4 hover:border-primary/50 hover:bg-muted/50 transition-colors text-center">
                    <input
                      id="file-upload"
                      type="file"
                      className="hidden"
                      onChange={handleFileUpload}
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.jpg,.jpeg,.png,.gif"
                      disabled={isUploading}
                    />
                    {isUploading ? (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <span className="text-sm text-muted-foreground">Uploading...</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <Upload className="h-8 w-8 text-muted-foreground" />
                        <span className="text-sm font-medium">Click to upload</span>
                        <span className="text-xs text-muted-foreground">PDF, Word, Excel, Images (max 10MB)</span>
                      </div>
                    )}
                  </div>
                </Label>
              </div>

              {/* Document List */}
              {documentsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : documents && documents.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {documents.map((doc: any) => {
                    const FileIcon = getFileIcon(doc.file_type);
                    return (
                      <div key={doc.id} className="flex items-center gap-2 p-2 rounded-lg border hover:bg-muted/50 group">
                        <div className="p-1.5 rounded bg-muted">
                          <FileIcon className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{doc.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(doc.file_size)} • {format(new Date(doc.created_at), 'MMM d')}
                          </p>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleDownloadDoc(doc.id, doc.name)}
                            disabled={downloadDocument.isPending}
                          >
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteDoc(doc.id, doc.name)}
                            disabled={deleteDocument.isPending}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <p className="text-sm">No documents uploaded yet.</p>
                </div>
              )}
            </CardContent>
         </Card>
       </div>
    </div>
  );
}

// --- Integration Page ---
// API hooks for Integration Page
function useWebhooks(projectId: string | null) {
  return useQuery({
    queryKey: ['portal', 'webhooks', projectId],
    queryFn: async () => {
      if (!projectId) throw new Error('No project ID');
      const response = await fetch(`/api/portal/projects/${projectId}/webhooks`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch webhooks');
      const data = await response.json();
      return data.webhooks;
    },
    enabled: !!projectId,
  });
}

function useCreateWebhook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, url, events, description }: { projectId: string; url: string; events?: string[]; description?: string }) => {
      const response = await fetch(`/api/portal/projects/${projectId}/webhooks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ url, events, description }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create webhook');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal', 'webhooks'] });
    },
  });
}

function useDeleteWebhook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (webhookId: string) => {
      const response = await fetch(`/api/portal/webhooks/${webhookId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to delete webhook');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal', 'webhooks'] });
    },
  });
}

function useRegenerateApiCredentials() {
  return useMutation({
    mutationFn: async (projectId: string) => {
      const response = await fetch(`/api/portal/projects/${projectId}/api-credentials/regenerate`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to regenerate credentials');
      }
      return response.json();
    },
  });
}

function useIntegrations(projectId: string | null) {
  return useQuery({
    queryKey: ['portal', 'integrations', projectId],
    queryFn: async () => {
      if (!projectId) throw new Error('No project ID');
      const response = await fetch(`/api/portal/projects/${projectId}/integrations`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch integrations');
      const data = await response.json();
      return data.integrations;
    },
    enabled: !!projectId,
  });
}

function useCreateIntegration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, systemName, systemType, connectionMethod, apiDocumentationUrl, notes }: {
      projectId: string;
      systemName: string;
      systemType: string;
      connectionMethod?: string;
      apiDocumentationUrl?: string;
      notes?: string;
    }) => {
      const response = await fetch(`/api/portal/projects/${projectId}/integrations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ systemName, systemType, connectionMethod, apiDocumentationUrl, notes }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create integration');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal', 'integrations'] });
    },
  });
}

export function IntegrationPage() {
  const { data: projects } = useProjects();
  const currentProject = projects?.[0];
  const { data: project, isLoading } = useProject(currentProject?.id || null);
  const { data: webhooks, isLoading: webhooksLoading } = useWebhooks(currentProject?.id || null);
  const { data: integrations } = useIntegrations(currentProject?.id || null);
  const { toast } = useToast();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [showCredentials, setShowCredentials] = useState<{ apiKey: string; apiSecret: string } | null>(null);

  const createWebhook = useCreateWebhook();
  const deleteWebhook = useDeleteWebhook();
  const regenerateCredentials = useRegenerateApiCredentials();

  const copyToClipboard = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    toast({ title: "Copied!", description: `${keyName} copied to clipboard` });
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleCreateWebhook = async () => {
    if (!currentProject?.id || !webhookUrl) {
      toast({ title: "URL required", description: "Please enter a webhook URL", variant: "destructive" });
      return;
    }
    try {
      const result = await createWebhook.mutateAsync({
        projectId: currentProject.id,
        url: webhookUrl,
        events: ['*'],
      });
      toast({
        title: "Webhook created!",
        description: `Secret: ${result.webhook.secret.slice(0, 20)}... (copied to clipboard)`,
      });
      navigator.clipboard.writeText(result.webhook.secret);
      setWebhookUrl('');
    } catch (error) {
      toast({
        title: "Failed to create webhook",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    }
  };

  const handleRegenerateCredentials = async () => {
    if (!currentProject?.id) return;
    try {
      const result = await regenerateCredentials.mutateAsync(currentProject.id);
      setShowCredentials(result.credentials);
      toast({
        title: "Credentials regenerated!",
        description: "Save your new API secret - it won't be shown again.",
      });
    } catch (error) {
      toast({
        title: "Failed to regenerate",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const apiCredentials = showCredentials || {
    apiKey: (project as any)?.api_key || `ciq_${currentProject?.id?.slice(0, 8) || 'demo'}_pending`,
    apiSecret: '••••••••••••••••••••••••',
  };

  const webhookCount = webhooks?.length || 0;
  const integrationStatus = {
    api: (project as any)?.api_key ? 'connected' : 'pending',
    webhook: webhookCount > 0 ? 'connected' : 'pending',
    sso: 'not_configured',
  };

  const handleDeleteWebhook = async (webhookId: string) => {
    try {
      await deleteWebhook.mutateAsync(webhookId);
      toast({ title: "Webhook deleted" });
    } catch (error) {
      toast({
        title: "Failed to delete webhook",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    }
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

        <Card className={`border-l-4 ${integrationStatus.webhook === 'connected' ? 'border-l-green-500' : 'border-l-amber-500'}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${integrationStatus.webhook === 'connected' ? 'bg-green-100' : 'bg-amber-100'}`}>
                  <RefreshCw className={`h-5 w-5 ${integrationStatus.webhook === 'connected' ? 'text-green-600' : 'text-amber-600'}`} />
                </div>
                <div>
                  <p className="font-medium">Webhooks</p>
                  <p className="text-sm text-muted-foreground">
                    {webhookCount > 0 ? `${webhookCount} configured` : 'Pending Setup'}
                  </p>
                </div>
              </div>
              {integrationStatus.webhook === 'connected' ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <Clock className="h-5 w-5 text-amber-500" />
              )}
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

          {showCredentials && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <strong>New credentials generated!</strong> Save your API secret now - it won't be shown again.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>API Key</Label>
              <div className="flex gap-2">
                <Input value={apiCredentials.apiKey} readOnly className="font-mono bg-muted" />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(apiCredentials.apiKey, 'API Key')}
                >
                  {copiedKey === 'API Key' ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              {!showCredentials && (
                <p className="text-xs text-muted-foreground">Generate new credentials to see your API key.</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>API Secret</Label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Input
                    value={apiCredentials.apiSecret}
                    readOnly
                    className="font-mono bg-muted pr-10"
                    type={showCredentials ? "text" : "password"}
                  />
                  <Eye className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
                {showCredentials && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(apiCredentials.apiSecret, 'API Secret')}
                  >
                    {copiedKey === 'API Secret' ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                )}
              </div>
              {showCredentials && (
                <p className="text-xs text-destructive font-medium">⚠️ Copy this secret now. It will not be shown again.</p>
              )}
            </div>
          </div>

          <Separator />

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex items-center gap-2"
              onClick={handleRegenerateCredentials}
              disabled={regenerateCredentials.isPending}
            >
              {regenerateCredentials.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {regenerateCredentials.isPending ? 'Generating...' : 'Regenerate Keys'}
            </Button>
            <Button
              variant="outline"
              className="flex items-center gap-2"
              onClick={() => window.open('https://docs.claimsiq.com/api', '_blank')}
            >
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
          {/* Existing Webhooks */}
          {webhooks && webhooks.length > 0 && (
            <div className="space-y-3">
              <Label>Registered Webhooks</Label>
              <div className="space-y-2">
                {webhooks.map((webhook: any) => (
                  <div key={webhook.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`p-1.5 rounded ${webhook.is_active ? 'bg-green-100' : 'bg-slate-100'}`}>
                        <Globe className={`h-4 w-4 ${webhook.is_active ? 'text-green-600' : 'text-slate-500'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-mono truncate">{webhook.url}</p>
                        <p className="text-xs text-muted-foreground">
                          {webhook.events?.includes('*') ? 'All events' : webhook.events?.join(', ')}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDeleteWebhook(webhook.id)}
                      disabled={deleteWebhook.isPending}
                    >
                      {deleteWebhook.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <XCircle className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
              <Separator />
            </div>
          )}

          {/* Add New Webhook */}
          <div className="space-y-2">
            <Label>Add New Webhook Endpoint</Label>
            <div className="flex gap-2">
              <Input
                placeholder="https://your-domain.com/webhooks/claims-iq"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={handleCreateWebhook}
                disabled={createWebhook.isPending || !webhookUrl.trim()}
              >
                {createWebhook.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Add'
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">We'll send POST requests to this URL when events occur. A secret will be generated for signature verification.</p>
          </div>

          <div className="space-y-3">
            <Label>Supported Events</Label>
            <div className="grid md:grid-cols-2 gap-3">
              {[
                { id: 'claim.created', label: 'Claim Created', desc: 'When a new claim is submitted' },
                { id: 'claim.updated', label: 'Claim Updated', desc: 'When claim details change' },
                { id: 'document.processed', label: 'Document Processed', desc: 'When AI finishes analyzing a document' },
                { id: 'status.changed', label: 'Status Changed', desc: 'When claim status updates' },
              ].map((event) => (
                <div key={event.id} className="flex items-start gap-3 p-3 rounded-lg border bg-muted/20">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">{event.label}</p>
                    <p className="text-xs text-muted-foreground">{event.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">All events are sent by default. Contact support for custom event filtering.</p>
          </div>
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
  const { toast } = useToast();
  const inviteTeamMember = useInviteTeamMember();
  const queryClient = useQueryClient();

  // Invite dialog state
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    title: '',
    role: 'other',
  });

  const handleInvite = async () => {
    if (!inviteForm.email || !inviteForm.firstName || !inviteForm.lastName) {
      toast({
        title: "Missing required fields",
        description: "Please fill in email, first name, and last name.",
        variant: "destructive",
      });
      return;
    }

    try {
      await inviteTeamMember.mutateAsync(inviteForm);
      toast({
        title: "Invitation sent!",
        description: `An invitation has been sent to ${inviteForm.email}.`,
      });
      setShowInviteDialog(false);
      setInviteForm({ email: '', firstName: '', lastName: '', title: '', role: 'other' });
      queryClient.invalidateQueries({ queryKey: ['portal', 'project'] });
    } catch (error) {
      toast({
        title: "Failed to send invitation",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    }
  };

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
        <Button className="flex items-center gap-2" onClick={() => setShowInviteDialog(true)}>
          <UserPlus className="h-4 w-4" />
          Invite Team Member
        </Button>
      </div>

      {/* Invite Dialog */}
      {showInviteDialog && (
        <Card className="border-2 border-primary/20">
          <CardHeader>
            <CardTitle className="font-display">Invite Team Member</CardTitle>
            <CardDescription>Send an invitation to a new team member.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="invite-email">Email *</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="colleague@company.com"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-title">Title</Label>
                <Input
                  id="invite-title"
                  placeholder="e.g. IT Manager"
                  value={inviteForm.title}
                  onChange={(e) => setInviteForm({ ...inviteForm, title: e.target.value })}
                />
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="invite-first-name">First Name *</Label>
                <Input
                  id="invite-first-name"
                  placeholder="John"
                  value={inviteForm.firstName}
                  onChange={(e) => setInviteForm({ ...inviteForm, firstName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-last-name">Last Name *</Label>
                <Input
                  id="invite-last-name"
                  placeholder="Doe"
                  value={inviteForm.lastName}
                  onChange={(e) => setInviteForm({ ...inviteForm, lastName: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-role">Role</Label>
              <select
                id="invite-role"
                className="w-full p-2 border rounded-md bg-background"
                value={inviteForm.role}
                onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
              >
                <option value="technical">Technical</option>
                <option value="executive">Executive</option>
                <option value="billing">Billing</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowInviteDialog(false);
                  setInviteForm({ email: '', firstName: '', lastName: '', title: '', role: 'other' });
                }}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleInvite}
                disabled={inviteTeamMember.isPending}
              >
                {inviteTeamMember.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    Send Invitation
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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
  const updateProfile = useUpdateProfile();
  const changePassword = useChangePassword();
  const checkPasswordStrength = usePasswordStrength();

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: '',
    title: '',
  });

  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordStrength, setPasswordStrength] = useState<{ valid: boolean; score: number; errors: string[] } | null>(null);

  // Update form when user data loads
  useEffect(() => {
    if (user) {
      setProfileForm(prev => ({
        ...prev,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
      }));
    }
  }, [user]);

  const handleSaveProfile = async () => {
    try {
      await updateProfile.mutateAsync(profileForm);
      toast({
        title: "Profile updated",
        description: "Your profile information has been saved.",
      });
    } catch (error) {
      toast({
        title: "Failed to update profile",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    }
  };

  const handlePasswordStrengthCheck = async (password: string) => {
    if (password.length < 4) {
      setPasswordStrength(null);
      return;
    }
    try {
      const result = await checkPasswordStrength.mutateAsync(password);
      setPasswordStrength(result);
    } catch {
      // Ignore errors
    }
  };

  const handleChangePassword = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast({
        title: "Missing fields",
        description: "Please fill in all password fields.",
        variant: "destructive",
      });
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "New password and confirmation must match.",
        variant: "destructive",
      });
      return;
    }

    if (passwordStrength && !passwordStrength.valid) {
      toast({
        title: "Weak password",
        description: passwordStrength.errors[0] || "Please choose a stronger password.",
        variant: "destructive",
      });
      return;
    }

    try {
      await changePassword.mutateAsync({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      toast({
        title: "Password changed",
        description: "Your password has been updated successfully.",
      });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordStrength(null);
    } catch (error) {
      toast({
        title: "Failed to change password",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

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
                  <Input
                    value={profileForm.firstName}
                    onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Last Name</Label>
                  <Input
                    value={profileForm.lastName}
                    onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={profileForm.title}
                    onChange={(e) => setProfileForm({ ...profileForm, title: e.target.value })}
                    placeholder="e.g. Claims Manager"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Email Address</Label>
                <Input defaultValue={user?.email || ''} disabled />
                <p className="text-xs text-muted-foreground">Contact support to change your email address.</p>
              </div>
              <Button onClick={handleSaveProfile} disabled={updateProfile.isPending}>
                {updateProfile.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
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
                <Input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>New Password</Label>
                <Input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => {
                    setPasswordForm({ ...passwordForm, newPassword: e.target.value });
                    handlePasswordStrengthCheck(e.target.value);
                  }}
                />
                {passwordStrength && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            passwordStrength.score >= 80
                              ? 'bg-green-500'
                              : passwordStrength.score >= 60
                              ? 'bg-yellow-500'
                              : passwordStrength.score >= 40
                              ? 'bg-orange-500'
                              : 'bg-red-500'
                          }`}
                          style={{ width: `${passwordStrength.score}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-12 text-right">
                        {passwordStrength.score >= 80
                          ? 'Strong'
                          : passwordStrength.score >= 60
                          ? 'Good'
                          : passwordStrength.score >= 40
                          ? 'Fair'
                          : 'Weak'}
                      </span>
                    </div>
                    {passwordStrength.errors.length > 0 && (
                      <p className="text-xs text-destructive">{passwordStrength.errors[0]}</p>
                    )}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Confirm New Password</Label>
                <Input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                />
                {passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword && (
                  <p className="text-xs text-destructive">Passwords do not match</p>
                )}
              </div>
              <Button onClick={handleChangePassword} disabled={changePassword.isPending}>
                {changePassword.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Password'
                )}
              </Button>
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
