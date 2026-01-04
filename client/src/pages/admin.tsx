import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  LayoutDashboard, 
  Users, 
  Briefcase, 
  Settings, 
  LogOut, 
  Search, 
  Filter, 
  MoreHorizontal,
  Building,
  BarChart3,
  FileText,
  Clock,
  CheckCircle2
} from "lucide-react";
import logo from "@assets/ClaimsIQ_Logo_02-09[31]_1767489942619.png";

// --- Layout Component ---
function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

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
              <AvatarFallback>AD</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">Admin User</p>
              <p className="text-xs text-sidebar-foreground/70 truncate">Claims IQ Inc.</p>
            </div>
            <Button variant="ghost" size="icon" className="text-sidebar-foreground/50 hover:text-white">
              <LogOut className="h-4 w-4" />
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
              <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                + New Client
              </Button>
           </div>
        </header>
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

function NavItem({ href, icon: Icon, label, active }: any) {
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
  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Metrics */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Active Projects", value: "24", icon: Briefcase, color: "text-primary", bg: "bg-primary/10" },
            { label: "Discovery Phase", value: "8", icon: Search, color: "text-secondary-foreground", bg: "bg-secondary/10" },
            { label: "Pending SoW", value: "3", icon: FileText, color: "text-accent", bg: "bg-accent/10" },
            { label: "Go-Live This Month", value: "5", icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50" },
          ].map((metric, i) => (
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
                <Input type="search" placeholder="Search projects..." className="pl-9 bg-muted/50" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company Name</TableHead>
                  <TableHead>Project Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Modules</TableHead>
                  <TableHead>Target Go-Live</TableHead>
                  <TableHead>CSM</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  { name: "Acme Insurance", project: "Q1 Modernization", status: "SOW Pending", modules: ["Core", "FNOL"], date: "Mar 15, 2026", csm: "John D.", statusColor: "bg-accent/20 text-accent border-accent/20" },
                  { name: "Global Liability Co.", project: "Claims Transformation", status: "Discovery", modules: ["Core", "Comms"], date: "Apr 01, 2026", csm: "Sarah M.", statusColor: "bg-primary/20 text-primary border-primary/20" },
                  { name: "SafeHome Mutual", project: "Digital Intake", status: "Contract Signed", modules: ["FNOL"], date: "Feb 28, 2026", csm: "Mike R.", statusColor: "bg-secondary/20 text-secondary-foreground border-secondary/20" },
                  { name: "Regional Auto", project: "Core Replacement", status: "Onboarding", modules: ["Core"], date: "May 10, 2026", csm: "John D.", statusColor: "bg-blue-100 text-blue-700 border-blue-200" },
                  { name: "TechInsure", project: "Greenfield Launch", status: "Live", modules: ["Core", "Comms", "FNOL"], date: "Jan 01, 2026", csm: "Sarah M.", statusColor: "bg-green-100 text-green-700 border-green-200" },
                ].map((row, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell className="text-muted-foreground">{row.project}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${row.statusColor}`}>
                        {row.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {row.modules.map(m => (
                          <span key={m} className="px-1.5 py-0.5 bg-muted text-muted-foreground rounded text-[10px] uppercase font-bold tracking-wide">
                            {m}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono text-xs">{row.date}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                         <Avatar className="h-6 w-6">
                           <AvatarFallback className="text-[10px] bg-muted text-muted-foreground">{row.csm.split(" ")[0][0]}{row.csm.split(" ")[1][0]}</AvatarFallback>
                         </Avatar>
                         <span className="text-sm">{row.csm}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}