import { Link, Switch, Route, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
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
  Building,
  ArrowRight,
  Download
} from "lucide-react";
import { useState } from "react";

// --- Layout Component ---
function PortalLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex-col hidden md:flex fixed h-full z-20">
        <div className="h-16 flex items-center px-6 border-b border-slate-800">
           <div className="flex items-center gap-2 font-bold text-lg text-white">
             <Building className="h-5 w-5 text-blue-500" />
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

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9 border border-slate-600">
              <AvatarFallback>JD</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">John Doe</p>
              <p className="text-xs text-slate-500 truncate">Acme Insurance</p>
            </div>
            <Button variant="ghost" size="icon" className="text-slate-500 hover:text-white">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 sticky top-0 z-10">
           <h1 className="text-xl font-semibold text-slate-800">
             {location === "/portal" ? "Dashboard" : location === "/portal/sow" ? "Statement of Work" : "Portal"}
           </h1>
           <div className="flex items-center gap-4">
              <div className="text-sm text-slate-500 hidden sm:block">Last login: Today at 9:42 AM</div>
              <Avatar className="h-8 w-8 md:hidden">
                <AvatarFallback>JD</AvatarFallback>
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

function NavItem({ href, icon: Icon, label, active }: any) {
  return (
    <Link href={href}>
      <div className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
        active 
          ? "bg-blue-600 text-white" 
          : "hover:bg-slate-800 hover:text-white"
      }`}>
        <Icon className="h-5 w-5" />
        {label}
      </div>
    </Link>
  );
}

// --- Dashboard Page ---
export function PortalDashboard() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Progress Card */}
      <Card className="border-none shadow-md bg-gradient-to-r from-slate-900 to-slate-800 text-white overflow-hidden relative">
         <div className="absolute top-0 right-0 p-32 bg-blue-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
         <CardContent className="p-8 relative z-10">
           <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
             <div>
               <h2 className="text-2xl font-bold mb-1">Onboarding Progress</h2>
               <p className="text-slate-300">Stage: <span className="text-blue-400 font-medium">SOW Review</span></p>
             </div>
             <div className="text-right">
               <div className="text-3xl font-bold">65%</div>
               <div className="text-slate-400 text-sm">Target Go-Live: Mar 15, 2026</div>
             </div>
           </div>
           <Progress value={65} className="h-3 bg-slate-700" />
           <div className="mt-6 flex gap-3">
             <Link href="/portal/sow">
                <Button variant="secondary" className="text-slate-900">Review SOW</Button>
             </Link>
             <Button variant="outline" className="text-white border-slate-600 hover:bg-slate-700">Contact CSM</Button>
           </div>
         </CardContent>
      </Card>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Checklist */}
        <Card className="md:col-span-2 shadow-sm">
          <CardHeader>
            <CardTitle>Onboarding Checklist</CardTitle>
            <CardDescription>Tasks required to complete your setup.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {[
                { label: "Company Profile", status: "completed", date: "Jan 02" },
                { label: "Module Selection", status: "completed", date: "Jan 02" },
                { label: "Technical Requirements", status: "completed", date: "Jan 03" },
                { label: "Sign Statement of Work", status: "pending", date: "Due Today", action: true },
                { label: "Schedule Technical Kickoff", status: "upcoming", date: "Jan 07" },
                { label: "Configure SSO", status: "upcoming", date: "Jan 10" },
              ].map((item, i) => (
                <div key={i} className="flex items-center p-3 hover:bg-slate-50 rounded-lg group">
                  <div className="mr-4">
                    {item.status === "completed" ? (
                      <CheckCircle2 className="text-emerald-500 h-5 w-5" />
                    ) : item.status === "pending" ? (
                      <AlertCircle className="text-amber-500 h-5 w-5" />
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-slate-200" />
                    )}
                  </div>
                  <div className={`flex-1 ${item.status === "completed" ? "line-through text-slate-400" : "font-medium text-slate-700"}`}>
                    {item.label}
                  </div>
                  <div className="text-sm text-slate-400 mr-4">{item.date}</div>
                  {item.action && (
                    <Button size="sm" variant="outline" className="h-7 text-xs">View</Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Activity Feed */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6 relative border-l border-slate-200 ml-2 pl-6 pb-2">
              {[
                { text: "SOW Generated v1.0", time: "2 hours ago", icon: FileCheck },
                { text: "Requirements submitted", time: "Yesterday", icon: CheckCircle2 },
                { text: "Account created", time: "2 days ago", icon: Users },
              ].map((item, i) => (
                <div key={i} className="relative">
                   <div className="absolute -left-[31px] bg-white p-1">
                      <item.icon className="h-4 w-4 text-slate-400" />
                   </div>
                   <p className="text-sm font-medium text-slate-800">{item.text}</p>
                   <p className="text-xs text-slate-500">{item.time}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// --- SOW Page ---
export function SOWPage() {
  return (
    <div className="flex flex-col xl:flex-row gap-6 h-[calc(100vh-8rem)]">
       {/* Document Viewer */}
       <div className="flex-1 bg-slate-200 rounded-lg overflow-y-auto p-8 shadow-inner border border-slate-300">
         <div className="max-w-[800px] mx-auto bg-white min-h-[1000px] shadow-lg p-12 md:p-16 text-slate-800">
            {/* Fake Document Content */}
            <div className="flex justify-between items-start mb-12">
               <div className="flex items-center gap-2 font-bold text-xl text-slate-900">
                  <Building className="h-6 w-6 text-blue-600" />
                  <span>Claims iQ</span>
               </div>
               <div className="text-right text-sm text-slate-500">
                 <p>SOW #: CIQ-2026-0042</p>
                 <p>Date: January 4, 2026</p>
               </div>
            </div>

            <h1 className="text-3xl font-bold mb-8 text-center border-b pb-6">Statement of Work</h1>

            <div className="space-y-6 text-sm leading-relaxed">
               <section>
                 <h3 className="font-bold text-lg mb-2 text-slate-900">1. Executive Summary</h3>
                 <p>This Statement of Work ("SOW") outlines the implementation services to be provided by Claims IQ Inc. ("Provider") to Acme Insurance Ltd. ("Client") for the deployment of the Claims IQ platform.</p>
               </section>

               <section>
                 <h3 className="font-bold text-lg mb-2 text-slate-900">2. Scope of Services</h3>
                 <p className="mb-2">The following modules will be provisioned:</p>
                 <ul className="list-disc pl-5 space-y-1">
                   <li><strong>Core Intelligence Engine:</strong> Document processing configuration for 10,000 monthly documents.</li>
                   <li><strong>Smart FNOL:</strong> Web intake portal configuration with photo upload capabilities.</li>
                 </ul>
               </section>

               <section>
                 <h3 className="font-bold text-lg mb-2 text-slate-900">3. Implementation Timeline</h3>
                 <table className="w-full border-collapse border border-slate-200 text-left mt-2">
                   <thead>
                     <tr className="bg-slate-50">
                       <th className="border p-2">Phase</th>
                       <th className="border p-2">Duration</th>
                       <th className="border p-2">Deliverable</th>
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
                    <p className="font-bold">Acme Insurance Ltd.</p>
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
         <Card>
           <CardHeader>
             <CardTitle className="text-lg">Actions</CardTitle>
           </CardHeader>
           <CardContent className="space-y-3">
             <Button className="w-full" size="lg">Approve & Sign</Button>
             <Button variant="outline" className="w-full">Request Changes</Button>
             <Button variant="ghost" className="w-full flex items-center gap-2">
               <Download className="h-4 w-4" /> Download PDF
             </Button>
           </CardContent>
         </Card>

         <Card>
            <CardHeader>
              <CardTitle className="text-lg">Version History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm p-2 bg-slate-50 rounded border border-slate-100">
                  <span className="font-medium">v1.0 (Current)</span>
                  <span className="text-slate-500 text-xs">Today</span>
                </div>
              </div>
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