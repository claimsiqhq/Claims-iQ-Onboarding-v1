import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Settings,
  LogOut,
  Search,
  Filter,
  MoreHorizontal,
  FileText,
  CheckCircle2,
  Loader2
} from "lucide-react";
import { useAuth, useSignOut, useRequireStaff } from "../hooks/useAuth";
import logo from "@assets/ClaimsIQ_Logo_02-09[31]_1767489942619.png";
import type { ProjectSummary } from "@shared/types";
import { format } from "date-fns";
import { useState } from "react";

// --- API Hooks ---
function useAdminProjects() {
  return useQuery<ProjectSummary[]>({
    queryKey: ['admin', 'projects'],
    queryFn: async () => {
      const response = await fetch('/api/admin/projects', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch projects');
      const data = await response.json();
      return data.projects;
    },
  });
}

function useAdminStats() {
  return useQuery<{
    totalProjects: number;
    totalCompanies: number;
    byStatus: Record<string, number>;
  }>({
    queryKey: ['admin', 'stats'],
    queryFn: async () => {
      const response = await fetch('/api/admin/stats', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch stats');
      const data = await response.json();
      return data.stats;
    },
  });
}

// --- Helper Functions ---
function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    discovery_in_progress: 'Discovery',
    sow_pending: 'SOW Pending',
    contract_signed: 'Contract Signed',
    onboarding: 'Onboarding',
    live: 'Live',
    churned: 'Churned',
  };
  return labels[status] || status;
}

function getStatusStyle(status: string): string {
  const styles: Record<string, string> = {
    discovery_in_progress: 'bg-primary/20 text-primary border-primary/20',
    sow_pending: 'bg-accent/20 text-accent border-accent/20',
    contract_signed: 'bg-secondary/20 text-secondary-foreground border-secondary/20',
    onboarding: 'bg-blue-100 text-blue-700 border-blue-200',
    live: 'bg-green-100 text-green-700 border-green-200',
    churned: 'bg-red-100 text-red-700 border-red-200',
  };
  return styles[status] || 'bg-muted text-muted-foreground border-muted';
}

function getInitials(firstName?: string, lastName?: string): string {
  if (!firstName && !lastName) return '??';
  return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
}

// --- Layout Component ---
function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, isLoading } = useAuth();
  const signOut = useSignOut();

  const handleSignOut = () => {
    signOut.mutate();
  };

  const userName = user?.firstName && user?.lastName
    ? `${user.firstName} ${user.lastName}`
    : user?.email?.split('@')[0] || 'Admin';

  const initials = getInitials(user?.firstName, user?.lastName);

  return (
    <div className="min-h-screen bg-muted/20 flex font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar text-sidebar-foreground flex-col hidden md:flex fixed h-full z-20 border-r border-sidebar-border">
        <div className="h-16 flex items-center px-6 border-b border-sidebar-border">
           <div className="flex items-center gap-2 font-bold text-lg text-sidebar-primary-foreground font-display">
             <img src={logo} alt="Claims iQ" className="h-6 w-6 object-contain" />
             <span>Claims iQ</span>
             <Badge variant="outline" className="ml-2 text-[10px] border-sidebar-border text-sidebar-foreground/70">ADMIN</Badge>
           </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <NavItem href="/admin" icon={LayoutDashboard} label="Dashboard" active={location === "/admin"} />
          <NavItem href="#" icon={Users} label="Clients" />
          <NavItem href="#" icon={Briefcase} label="Projects" />
          <NavItem href="#" icon={Users} label="Team" />
          <NavItem href="#" icon={Settings} label="Settings" />
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9 bg-primary text-primary-foreground">
              <AvatarFallback>{isLoading ? '...' : initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {isLoading ? 'Loading...' : userName}
              </p>
              <p className="text-xs text-sidebar-foreground/70 truncate">Claims IQ Inc.</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-sidebar-foreground/50 hover:text-white"
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
           <div className="flex items-center gap-4">
             <h1 className="text-xl font-semibold text-foreground font-display">Admin Dashboard</h1>
           </div>
           <div className="flex items-center gap-4">
              <Button size="sm" variant="outline" className="hidden sm:flex">
                <Filter className="mr-2 h-4 w-4" /> Filter View
              </Button>
              <Link href="/onboarding">
                <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  + New Client
                </Button>
              </Link>
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

// --- Dashboard Content ---
export default function AdminDashboard() {
  const { isLoading: authLoading, isStaff } = useRequireStaff();
  const { data: projects, isLoading: projectsLoading, error: projectsError } = useAdminProjects();
  const { data: stats, isLoading: statsLoading } = useAdminStats();
  const [searchTerm, setSearchTerm] = useState('');

  const isLoading = authLoading || projectsLoading || statsLoading;

  // Filter projects by search term
  const filteredProjects = projects?.filter(p =>
    p.company?.legal_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.status.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="space-y-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </div>
      </AdminLayout>
    );
  }

  if (projectsError) {
    return (
      <AdminLayout>
        <Alert variant="destructive">
          <AlertDescription>Failed to load projects. Please try again.</AlertDescription>
        </Alert>
      </AdminLayout>
    );
  }

  // Calculate metrics from stats
  const discoveryCount = stats?.byStatus?.discovery_in_progress || 0;
  const sowPendingCount = stats?.byStatus?.sow_pending || 0;
  const liveCount = stats?.byStatus?.live || 0;
  const totalProjects = stats?.totalProjects || 0;

  const metrics = [
    { label: "Active Projects", value: String(totalProjects), icon: Briefcase, color: "text-primary", bg: "bg-primary/10" },
    { label: "Discovery Phase", value: String(discoveryCount), icon: Search, color: "text-secondary-foreground", bg: "bg-secondary/10" },
    { label: "Pending SoW", value: String(sowPendingCount), icon: FileText, color: "text-accent", bg: "bg-accent/10" },
    { label: "Live", value: String(liveCount), icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50" },
  ];

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Metrics */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map((metric, i) => (
            <Card key={i} className="shadow-sm border-border">
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">{metric.label}</p>
                  <p className="text-3xl font-bold text-foreground font-mono">{metric.value}</p>
                </div>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${metric.bg} ${metric.color}`}>
                  <metric.icon className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Projects Table */}
        <Card className="shadow-sm border-border">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="font-display">Onboarding Projects</CardTitle>
              <CardDescription>Manage client onboarding status and progress.</CardDescription>
            </div>
            <div className="w-64">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search projects..."
                  className="pl-9 bg-muted/50"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredProjects.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Modules</TableHead>
                    <TableHead>Target Go-Live</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProjects.map((project) => {
                    const selectedModules = project.module_selections
                      ?.filter(m => m.is_selected)
                      .map(m => m.module_type.toUpperCase()) || [];

                    const progress = project.checklist_progress
                      ? Math.round((project.checklist_progress.completed / project.checklist_progress.total) * 100)
                      : 0;

                    return (
                      <TableRow key={project.id}>
                        <TableCell className="font-medium">
                          {project.company?.legal_name || 'Unknown Company'}
                          {project.company?.dba_name && (
                            <span className="text-muted-foreground text-xs ml-2">
                              (DBA: {project.company.dba_name})
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusStyle(project.status)}`}>
                            {getStatusLabel(project.status)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {selectedModules.map(m => (
                              <span key={m} className="px-1.5 py-0.5 bg-muted text-muted-foreground rounded text-[10px] uppercase font-bold tracking-wide">
                                {m}
                              </span>
                            ))}
                            {selectedModules.length === 0 && (
                              <span className="text-muted-foreground text-xs">None</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground font-mono text-xs">
                          {project.target_go_live_date
                            ? format(new Date(project.target_go_live_date), 'MMM d, yyyy')
                            : 'TBD'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-muted rounded-full h-2 overflow-hidden">
                              <div
                                className="bg-primary h-full rounded-full transition-all"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <span className="text-xs font-mono text-muted-foreground">{progress}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                {searchTerm ? (
                  <p>No projects matching "{searchTerm}"</p>
                ) : (
                  <p>No onboarding projects yet. Click "New Client" to start the first one.</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
