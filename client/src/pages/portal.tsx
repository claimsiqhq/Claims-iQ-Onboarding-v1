import { Link, Switch, Route, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  Loader2
} from "lucide-react";
import { useAuth, useSignOut, useRequireAuth } from "../hooks/useAuth";
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
          <NavItem href="#" icon={CheckCircle2} label="Integration" />
          <NavItem href="#" icon={Users} label="Team" />
          <NavItem href="#" icon={Settings} label="Settings" />
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
  const { isLoading: authLoading } = useRequireAuth();
  const { data: projects, isLoading: projectsLoading, error: projectsError } = useProjects();

  // Get the first (most recent) project for this user
  const currentProject = projects?.[0];
  const projectId = currentProject?.id || null;

  const { data: checklist, isLoading: checklistLoading } = useChecklist(projectId);
  const { data: activities, isLoading: activitiesLoading } = useActivity(projectId);
  const updateChecklistItem = useUpdateChecklistItem();

  const isLoading = authLoading || projectsLoading;
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
  const { isLoading: authLoading } = useRequireAuth();
  const { data: projects, isLoading: projectsLoading } = useProjects();
  const currentProject = projects?.[0];
  const { data: project, isLoading: projectLoading } = useProject(currentProject?.id || null);

  const isLoading = authLoading || projectsLoading || projectLoading;

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
             <Button className="w-full" size="lg">Approve & Sign</Button>
             <Button variant="outline" className="w-full">Request Changes</Button>
             <Button variant="ghost" className="w-full flex items-center gap-2">
               <Download className="h-4 w-4" /> Download PDF
             </Button>
           </CardContent>
         </Card>

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

// --- Main Wrapper ---
export default function Portal() {
  return (
    <PortalLayout>
       <Switch>
          <Route path="/portal" component={PortalDashboard} />
          <Route path="/portal/sow" component={SOWPage} />
       </Switch>
    </PortalLayout>
  );
}
