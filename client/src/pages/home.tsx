import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Check, ArrowRight, Zap, FileText, BarChart3 } from "lucide-react";
import heroBg from "@assets/generated_images/abstract_geometric_corporate_background.png";
import logo from "@assets/ClaimsIQ_Logo_02-09[31]_1767489942619.png";

export default function Home() {
  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 max-w-screen-xl items-center justify-between px-4">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tight text-primary font-display">
            <img src={logo} alt="Claims iQ" className="h-8 w-8 object-contain" />
            <span>Claims iQ</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <Link href="#features" className="hover:text-primary transition-colors">Features</Link>
            <Link href="#how-it-works" className="hover:text-primary transition-colors">How it Works</Link>
            <Link href="/portal" className="hover:text-primary transition-colors">Client Portal</Link>
          </nav>
          <div className="flex items-center gap-4">
            <Link href="/portal">
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground">Sign In</Button>
            </Link>
            <Link href="/onboarding">
              <Button>Get Started <ArrowRight className="ml-2 h-4 w-4" /></Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 md:pt-24 lg:pt-32 pb-16">
        <div className="absolute inset-0 z-0 opacity-20">
            <img src={heroBg} alt="Background" className="w-full h-full object-cover grayscale" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background"></div>
        </div>
        
        <div className="container relative z-10 max-w-screen-xl px-4 flex flex-col items-center text-center">
          <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-primary/10 text-primary hover:bg-primary/20 mb-8">
            Now with AI-Powered Document Analysis
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-foreground mb-6 max-w-4xl leading-tight font-display">
            Welcome to the <span className="text-primary">Claims iQ</span> Onboarding Portal
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mb-10">
            Complete your organization's setup in minutes. Our guided process collects everything we need to configure your AI-powered claims platform.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <Link href="/onboarding">
              <Button size="lg" className="h-12 px-8 text-base shadow-lg shadow-primary/25 font-semibold">
                Start Onboarding <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/portal">
              <Button size="lg" variant="outline" className="h-12 px-8 text-base bg-white/50 backdrop-blur-sm">
                Continue Setup
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 bg-muted/30" id="how-it-works">
        <div className="container max-w-screen-xl px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-foreground mb-4 font-display">How It Works</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">Getting started with Claims iQ is simple. We've streamlined the onboarding process to get you up and running faster.</p>
          </div>
          
          <div className="grid md:grid-cols-4 gap-8 relative">
            <div className="hidden md:block absolute top-12 left-[10%] right-[10%] h-0.5 bg-border -z-10"></div>
            
            {[
              { step: "01", title: "Company Profile", desc: "Tell us about your organization structure.", icon: FileText },
              { step: "02", title: "Select Modules", desc: "Choose the AI capabilities you need.", icon: Zap },
              { step: "03", title: "Requirements", desc: "Define your technical configuration.", icon: FileText },
              { step: "04", title: "Go Live", desc: "Receive your configured environment.", icon: BarChart3 },
            ].map((item, i) => (
              <div key={i} className="flex flex-col items-center text-center p-4">
                <div className="w-16 h-16 rounded-2xl bg-card border border-border shadow-sm flex items-center justify-center mb-6 relative z-10">
                  <item.icon className="w-8 h-8 text-primary" />
                  <span className="absolute -top-3 -right-3 w-8 h-8 bg-foreground text-background rounded-full flex items-center justify-center text-xs font-bold border-4 border-background">{item.step}</span>
                </div>
                <h3 className="text-xl font-semibold mb-2 text-foreground font-display">{item.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Modules */}
      <section className="py-24 bg-card" id="features">
        <div className="container max-w-screen-xl px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-foreground mb-4 font-display">Platform Modules</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">Select the components that power your specific claims workflow.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-t-4 border-t-primary shadow-md hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 text-primary">
                  <Zap className="w-6 h-6" />
                </div>
                <CardTitle className="font-display">Core Intelligence</CardTitle>
                <CardDescription>The brain of your claims operation.</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {[
                    "Document Classification",
                    "Data Extraction",
                    "Fraud Detection",
                    "Coverage Verification"
                  ].map((item, i) => (
                    <li key={i} className="flex items-start text-sm text-muted-foreground">
                      <Check className="w-4 h-4 mr-2 text-primary mt-0.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="border-t-4 border-t-accent shadow-md hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4 text-accent">
                  <FileText className="w-6 h-6" />
                </div>
                <CardTitle className="font-display">Communications</CardTitle>
                <CardDescription>Automated stakeholder engagement.</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {[
                    "Omnichannel Messaging",
                    "Status Updates",
                    "Document Requesting",
                    "NPS Collection"
                  ].map((item, i) => (
                    <li key={i} className="flex items-start text-sm text-muted-foreground">
                      <Check className="w-4 h-4 mr-2 text-accent mt-0.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="border-t-4 border-t-secondary shadow-md hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-secondary/10 flex items-center justify-center mb-4 text-secondary-foreground">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <CardTitle className="font-display">Smart FNOL</CardTitle>
                <CardDescription>Frictionless first notice of loss.</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {[
                    "Visual Intelligence",
                    "Dynamic Questioning",
                    "Fraud Prevention",
                    "Instant Triage"
                  ].map((item, i) => (
                    <li key={i} className="flex items-start text-sm text-muted-foreground">
                      <Check className="w-4 h-4 mr-2 text-secondary mt-0.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-sidebar text-sidebar-foreground py-12 mt-auto">
        <div className="container max-w-screen-xl px-4 grid md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 font-bold text-xl text-white mb-4 font-display">
              <img src={logo} alt="Claims iQ" className="h-8 w-8 object-contain" />
              <span>Claims iQ</span>
            </div>
            <p className="text-sm opacity-80">Revolutionizing claims processing with artificial intelligence.</p>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-4 font-display">Product</h4>
            <ul className="space-y-2 text-sm opacity-80">
              <li>Features</li>
              <li>Security</li>
              <li>Enterprise</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-4 font-display">Company</h4>
            <ul className="space-y-2 text-sm opacity-80">
              <li>About</li>
              <li>Careers</li>
              <li>Contact</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-4 font-display">Legal</h4>
            <ul className="space-y-2 text-sm opacity-80">
              <li>Privacy Policy</li>
              <li>Terms of Service</li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
}