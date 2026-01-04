import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronRight, ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import logo from "@assets/ClaimsIQ_Logo_02-09[31]_1767489942619.png";
import type { OnboardingFormData, CompanySize } from "@shared/types";

// Validation Schemas
const companySchema = z.object({
  legalName: z.string().min(2, "Legal name is required"),
  dba: z.string().optional(),
  website: z.string().url("Invalid URL").optional().or(z.literal("")),
  address: z.string().min(5, "Address is required"),
  address2: z.string().optional(),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  zip: z.string().min(5, "ZIP is required"),
  companySize: z.string(),
  claimsVolume: z.string(),
  linesOfBusiness: z.array(z.string()).min(1, "Select at least one line of business"),
});

const contactSchema = z.object({
  firstName: z.string().min(2, "First name required"),
  lastName: z.string().min(2, "Last name required"),
  email: z.string().email("Invalid email"),
  phone: z.string().min(10, "Valid phone required"),
  title: z.string().optional(),
  role: z.string(),
});

const modulesSchema = z.object({
  selectedModules: z.array(z.string()).min(1, "Select at least one module"),
});

// Steps configuration
const STEPS = [
  { id: 1, label: "Company Info" },
  { id: 2, label: "Primary Contact" },
  { id: 3, label: "Module Selection" },
  { id: 4, label: "Requirements" },
  { id: 5, label: "Review" },
];

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<any>({
    linesOfBusiness: [],
    selectedModules: ["core"],
  });
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const handleNext = (data: any) => {
    setFormData((prev: any) => ({ ...prev, ...data }));
    setStep((prev) => Math.min(prev + 1, 5));
    window.scrollTo(0, 0);
  };

  const handleBack = () => {
    setStep((prev) => Math.max(prev - 1, 1));
    window.scrollTo(0, 0);
  };

  // API mutation for submitting onboarding form
  const submitMutation = useMutation({
    mutationFn: async (data: OnboardingFormData) => {
      const response = await fetch('/api/onboarding/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Submission failed');
      }
      return result;
    },
    onSuccess: (result) => {
      toast({
        title: "Statement of Work Generated",
        description: "Your onboarding has been submitted successfully!",
      });
      // Store the project ID for reference
      localStorage.setItem('lastProjectId', result.projectId);
      setTimeout(() => setLocation("/"), 1500);
    },
    onError: (error) => {
      toast({
        title: "Submission Failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    },
  });

  // Transform form data to API format
  const transformFormData = (data: any): OnboardingFormData => {
    // Map company size
    const sizeMap: Record<string, CompanySize> = {
      '1-50': 'micro',
      '51-200': 'small',
      '201-1000': 'medium',
      '1000+': 'large',
    };

    return {
      company: {
        legal_name: data.legalName,
        dba_name: data.dba || undefined,
        website: data.website || undefined,
        address_line_1: data.address,
        address_line_2: data.address2 || undefined,
        city: data.city,
        state: data.state,
        postal_code: data.zip,
        company_size: sizeMap[data.companySize] || undefined,
        lines_of_business: data.linesOfBusiness || [],
      },
      contact: {
        first_name: data.firstName,
        last_name: data.lastName,
        email: data.email,
        phone: data.phone || undefined,
        title: data.title || undefined,
      },
      modules: {
        core: (data.selectedModules || []).includes('core'),
        comms: (data.selectedModules || []).includes('comms'),
        fnol: (data.selectedModules || []).includes('fnol'),
      },
      requirements: {
        core: (data.selectedModules || []).includes('core') ? {
          claim_types: [],
          perils: [],
          document_types: Object.entries(data.docTypes || {})
            .filter(([_, v]) => v)
            .map(([k]) => k),
          monthly_claim_volume: data.monthlyClaims ? parseInt(data.monthlyClaims) : undefined,
        } : undefined,
        comms: (data.selectedModules || []).includes('comms') ? {
          desired_channels: Object.entries(data.channels || {})
            .filter(([_, v]) => v)
            .map(([k]) => k),
          white_label_level: data.whiteLabelLevel || 'none',
          languages_required: ['English'],
        } : undefined,
        fnol: (data.selectedModules || []).includes('fnol') ? {
          desired_intake_methods: ['web'],
          lines_of_business: data.linesOfBusiness || [],
          photo_required: data.fnol?.photos || false,
          video_required: data.fnol?.video || false,
        } : undefined,
      },
    };
  };

  const handleSubmit = () => {
    const apiData = transformFormData(formData);
    submitMutation.mutate(apiData);
  };

  return (
    <div className="min-h-screen bg-muted/20 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <div className="container max-w-screen-xl px-4 h-16 flex items-center justify-between">
          <Link href="/">
            <div className="flex items-center gap-2 font-bold text-lg text-primary cursor-pointer font-display">
              <img src={logo} alt="Claims iQ" className="h-6 w-6 object-contain" />
              <span>Claims iQ</span>
            </div>
          </Link>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>Step {step} of 5</span>
            <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-500 ease-out" 
                style={{ width: `${(step / 5) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container max-w-3xl px-4 py-8 mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between relative">
            <div className="absolute top-1/2 left-0 w-full h-0.5 bg-border -z-10" />
            {STEPS.map((s) => {
              const isCompleted = step > s.id;
              const isCurrent = step === s.id;
              return (
                <div key={s.id} className="flex flex-col items-center gap-2 bg-background px-2">
                  <div 
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                      isCompleted ? "bg-accent text-accent-foreground" : 
                      isCurrent ? "bg-primary text-primary-foreground ring-4 ring-primary/20 scale-110" : 
                      "bg-muted text-muted-foreground"
                    }`}
                  >
                    {isCompleted ? <Check className="w-4 h-4" /> : s.id}
                  </div>
                  <span className={`text-xs font-medium hidden sm:block ${isCurrent ? "text-primary" : "text-muted-foreground"}`}>
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <Card className="border-border shadow-sm overflow-hidden">
          <CardContent className="p-6 md:p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
              >
                {step === 1 && <Step1Company defaultValues={formData} onNext={handleNext} />}
                {step === 2 && <Step2Contact defaultValues={formData} onNext={handleNext} onBack={handleBack} />}
                {step === 3 && <Step3Modules defaultValues={formData} onNext={handleNext} onBack={handleBack} />}
                {step === 4 && <Step4Requirements defaultValues={formData} onNext={handleNext} onBack={handleBack} />}
                {step === 5 && <Step5Review data={formData} onSubmit={handleSubmit} onBack={handleBack} isSubmitting={submitMutation.isPending} />}
              </motion.div>
            </AnimatePresence>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

// --- Steps Components ---

function Step1Company({ defaultValues, onNext }: any) {
  const form = useForm({ 
    defaultValues: { ...defaultValues },
    resolver: zodResolver(companySchema) 
  });

  return (
    <form onSubmit={form.handleSubmit(onNext)} className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground font-display">Company Information</h2>
        <p className="text-muted-foreground">Tell us about your organization.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Legal Company Name <span className="text-destructive">*</span></Label>
          <Input {...form.register("legalName")} placeholder="Acme Insurance Ltd." />
          {form.formState.errors.legalName && <p className="text-xs text-destructive">{(form.formState.errors.legalName.message as string)}</p>}
        </div>
        <div className="space-y-2">
          <Label>DBA / Trade Name</Label>
          <Input {...form.register("dba")} placeholder="Acme Insure" />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Website</Label>
        <Input {...form.register("website")} placeholder="https://example.com" />
      </div>

      <div className="space-y-2">
        <Label>Address <span className="text-destructive">*</span></Label>
        <Input {...form.register("address")} placeholder="123 Corporate Blvd" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="space-y-2 md:col-span-2">
          <Label>City <span className="text-destructive">*</span></Label>
          <Input {...form.register("city")} />
        </div>
        <div className="space-y-2">
          <Label>State <span className="text-destructive">*</span></Label>
          <Input {...form.register("state")} />
        </div>
        <div className="space-y-2">
          <Label>ZIP <span className="text-destructive">*</span></Label>
          <Input {...form.register("zip")} />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Company Size</Label>
          <Controller
            control={form.control}
            name="companySize"
            render={({ field }) => (
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <SelectTrigger><SelectValue placeholder="Select size" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1-50">1-50 employees</SelectItem>
                  <SelectItem value="51-200">51-200 employees</SelectItem>
                  <SelectItem value="201-1000">201-1000 employees</SelectItem>
                  <SelectItem value="1000+">1000+ employees</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className="space-y-2">
          <Label>Annual Claims Volume</Label>
          <Input type="number" {...form.register("claimsVolume")} placeholder="e.g. 10000" />
        </div>
      </div>

      <div className="space-y-3">
        <Label>Lines of Business <span className="text-destructive">*</span></Label>
        <div className="grid md:grid-cols-2 gap-3">
          {[
            "Personal Auto", "Commercial Auto", "Homeowners", "Renters",
            "Commercial Property", "Workers Comp", "General Liability", "Professional Liability"
          ].map((lob) => (
            <div key={lob} className="flex items-center space-x-2">
              <Controller
                control={form.control}
                name="linesOfBusiness"
                render={({ field }) => (
                  <Checkbox 
                    id={lob} 
                    checked={(field.value || []).includes(lob)}
                    onCheckedChange={(checked) => {
                      const current = field.value || [];
                      field.onChange(checked ? [...current, lob] : current.filter((v: string) => v !== lob));
                    }}
                  />
                )}
              />
              <label htmlFor={lob} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                {lob}
              </label>
            </div>
          ))}
        </div>
        {form.formState.errors.linesOfBusiness && <p className="text-xs text-destructive">{(form.formState.errors.linesOfBusiness.message as string)}</p>}
      </div>

      <div className="flex justify-end pt-4">
        <Button type="submit" size="lg">Continue <ArrowRight className="ml-2 h-4 w-4" /></Button>
      </div>
    </form>
  );
}

function Step2Contact({ defaultValues, onNext, onBack }: any) {
  const form = useForm({ defaultValues, resolver: zodResolver(contactSchema) });

  return (
    <form onSubmit={form.handleSubmit(onNext)} className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground font-display">Primary Contact</h2>
        <p className="text-muted-foreground">Who should we contact regarding this implementation?</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>First Name <span className="text-destructive">*</span></Label>
          <Input {...form.register("firstName")} />
        </div>
        <div className="space-y-2">
          <Label>Last Name <span className="text-destructive">*</span></Label>
          <Input {...form.register("lastName")} />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Email <span className="text-destructive">*</span></Label>
          <Input type="email" {...form.register("email")} />
        </div>
        <div className="space-y-2">
          <Label>Phone <span className="text-destructive">*</span></Label>
          <Input type="tel" {...form.register("phone")} />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Job Title</Label>
          <Input {...form.register("title")} />
        </div>
        <div className="space-y-2">
          <Label>Role <span className="text-destructive">*</span></Label>
          <Controller
            control={form.control}
            name="role"
            render={({ field }) => (
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="primary">Project Lead</SelectItem>
                  <SelectItem value="technical">Technical Lead</SelectItem>
                  <SelectItem value="executive">Executive Sponsor</SelectItem>
                  <SelectItem value="billing">Billing Contact</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <Button type="button" variant="outline" onClick={onBack}>Back</Button>
        <Button type="submit" size="lg">Continue <ArrowRight className="ml-2 h-4 w-4" /></Button>
      </div>
    </form>
  );
}

function Step3Modules({ defaultValues, onNext, onBack }: any) {
  const form = useForm({ defaultValues, resolver: zodResolver(modulesSchema) });

  return (
    <form onSubmit={form.handleSubmit(onNext)} className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground font-display">Module Selection</h2>
        <p className="text-muted-foreground">Select the Claims iQ modules you wish to implement.</p>
      </div>

      <div className="space-y-4">
        <Controller
          control={form.control}
          name="selectedModules"
          render={({ field }) => (
            <>
              {[
                { id: "core", name: "Core Intelligence", color: "border-primary", bg: "bg-primary/10", badge: "bg-primary/20 text-primary", desc: "AI document processing and extraction engine." },
                { id: "comms", name: "Communications", color: "border-accent", bg: "bg-accent/10", badge: "bg-accent/20 text-accent-foreground", desc: "Omnichannel stakeholder engagement platform." },
                { id: "fnol", name: "Smart FNOL", color: "border-secondary", bg: "bg-secondary/10", badge: "bg-secondary/20 text-secondary-foreground", desc: "Intelligent first notice of loss intake." },
              ].map((mod) => {
                const isSelected = (field.value || []).includes(mod.id);
                return (
                  <div 
                    key={mod.id}
                    className={`relative border-2 rounded-xl p-5 cursor-pointer transition-all ${
                      isSelected ? `${mod.color} ${mod.bg}` : "border-border hover:border-ring bg-card"
                    }`}
                    onClick={() => {
                      const current = field.value || [];
                      if (current.includes(mod.id)) {
                        field.onChange(current.filter((v: string) => v !== mod.id));
                      } else {
                        field.onChange([...current, mod.id]);
                      }
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold mb-2 ${mod.badge}`}>
                          {mod.id.toUpperCase()}
                        </span>
                        <h3 className="text-lg font-bold text-foreground">{mod.name}</h3>
                        <p className="text-muted-foreground mt-1">{mod.desc}</p>
                      </div>
                      <div className={`w-6 h-6 rounded border flex items-center justify-center ${isSelected ? "bg-primary border-primary text-primary-foreground" : "border-border bg-card"}`}>
                        {isSelected && <Check className="w-4 h-4" />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        />
        {form.formState.errors.selectedModules && <p className="text-xs text-destructive">{(form.formState.errors.selectedModules.message as string)}</p>}
      </div>

      <div className="flex justify-between pt-4">
        <Button type="button" variant="outline" onClick={onBack}>Back</Button>
        <Button type="submit" size="lg">Continue <ArrowRight className="ml-2 h-4 w-4" /></Button>
      </div>
    </form>
  );
}

function Step4Requirements({ defaultValues, onNext, onBack }: any) {
  const form = useForm({ defaultValues });
  const modules = defaultValues.selectedModules || [];

  return (
    <form onSubmit={form.handleSubmit(onNext)} className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-foreground font-display">Requirements</h2>
        <p className="text-muted-foreground">Configure your specific needs for the selected modules.</p>
      </div>

      {modules.includes("core") && (
        <div className="space-y-4 border border-border rounded-lg p-5 bg-card">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-primary"></span>
            <h3 className="font-semibold text-lg font-display">Core Intelligence Configuration</h3>
          </div>
          
          <div className="grid md:grid-cols-2 gap-4">
             <div className="space-y-2">
               <Label>Monthly Claim Volume Estimate</Label>
               <Input type="number" {...form.register("monthlyClaims")} placeholder="e.g. 500" />
             </div>
             <div className="space-y-2">
               <Label>Document Types Needed</Label>
               <div className="grid grid-cols-2 gap-2 mt-2">
                  {["Police Reports", "Medical Bills", "Repair Estimates", "Photos"].map(t => (
                    <label key={t} className="flex items-center gap-2 text-sm">
                      <Checkbox {...form.register(`docTypes.${t}`)} /> {t}
                    </label>
                  ))}
               </div>
             </div>
          </div>
        </div>
      )}

      {modules.includes("comms") && (
        <div className="space-y-4 border border-border rounded-lg p-5 bg-card">
          <div className="flex items-center gap-2 mb-2">
             <span className="w-2 h-2 rounded-full bg-accent"></span>
             <h3 className="font-semibold text-lg font-display">Communications Configuration</h3>
          </div>
          <div className="space-y-4">
             <div className="space-y-2">
               <Label>Required Channels</Label>
               <div className="flex gap-4">
                  {["Email", "SMS", "WhatsApp", "In-App"].map(c => (
                     <label key={c} className="flex items-center gap-2 text-sm border px-3 py-2 rounded hover:bg-muted cursor-pointer">
                       <Checkbox {...form.register(`channels.${c}`)} /> {c}
                     </label>
                  ))}
               </div>
             </div>
             <div className="space-y-2">
                <Label>White Labeling</Label>
                <RadioGroup defaultValue="basic" className="flex flex-col space-y-1">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="none" id="wl-none" />
                    <Label htmlFor="wl-none">None (Claims iQ Branding)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="basic" id="wl-basic" />
                    <Label htmlFor="wl-basic">Basic (Logo & Colors)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="full" id="wl-full" />
                    <Label htmlFor="wl-full">Full (Custom Domain & Email)</Label>
                  </div>
                </RadioGroup>
             </div>
          </div>
        </div>
      )}

      {modules.includes("fnol") && (
        <div className="space-y-4 border border-border rounded-lg p-5 bg-card">
           <div className="flex items-center gap-2 mb-2">
             <span className="w-2 h-2 rounded-full bg-secondary"></span>
             <h3 className="font-semibold text-lg font-display">FNOL Configuration</h3>
           </div>
           <div className="space-y-4">
             <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Photo Intake</Label>
                  <p className="text-sm text-muted-foreground">Allow users to upload photos during FNOL</p>
                </div>
                <Switch {...form.register("fnol.photos")} defaultChecked />
             </div>
             <Separator />
             <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Video Intake</Label>
                  <p className="text-sm text-muted-foreground">Allow users to record/upload video statements</p>
                </div>
                <Switch {...form.register("fnol.video")} />
             </div>
           </div>
        </div>
      )}

      {!modules.length && <p className="text-muted-foreground italic">No modules selected. Go back to select modules.</p>}

      <div className="flex justify-between pt-4">
        <Button type="button" variant="outline" onClick={onBack}>Back</Button>
        <Button type="submit" size="lg">Continue <ArrowRight className="ml-2 h-4 w-4" /></Button>
      </div>
    </form>
  );
}

function Step5Review({ data, onSubmit, onBack, isSubmitting }: { data: any; onSubmit: () => void; onBack: () => void; isSubmitting: boolean }) {
  const [confirmed, setConfirmed] = useState(false);

  const handleSubmit = () => {
    if (!confirmed || isSubmitting) return;
    onSubmit();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground font-display">Review & Submit</h2>
        <p className="text-muted-foreground">Please review your information before generating the SOW.</p>
      </div>

      <div className="grid gap-4">
        <Card className="bg-muted/30 border-border">
          <CardContent className="p-4 space-y-2">
            <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground font-mono">Company</h3>
            <p className="font-medium text-lg">{data.legalName}</p>
            <p className="text-muted-foreground">{data.address}, {data.city}, {data.state} {data.zip}</p>
          </CardContent>
        </Card>

        <Card className="bg-muted/30 border-border">
          <CardContent className="p-4 space-y-2">
             <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground font-mono">Primary Contact</h3>
             <p className="font-medium text-lg">{data.firstName} {data.lastName}</p>
             <p className="text-muted-foreground">{data.email} • {data.phone}</p>
             <p className="text-sm text-muted-foreground bg-muted inline-block px-2 py-0.5 rounded">{data.role}</p>
          </CardContent>
        </Card>

        <Card className="bg-muted/30 border-border">
           <CardContent className="p-4 space-y-2">
             <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground font-mono">Selected Modules</h3>
             <div className="flex flex-wrap gap-2">
               {(data.selectedModules || []).map((m: string) => (
                 <span key={m} className="px-3 py-1 rounded-full bg-primary/20 text-primary font-medium text-sm border border-primary/20 capitalize">
                   {m}
                 </span>
               ))}
             </div>
           </CardContent>
        </Card>
      </div>

      <div className="flex items-start space-x-2 p-4 bg-accent/10 border border-accent/20 rounded-lg">
        <Checkbox id="confirm" checked={confirmed} onCheckedChange={(c) => setConfirmed(!!c)} className="mt-1" />
        <label htmlFor="confirm" className="text-sm text-foreground cursor-pointer">
          I confirm that the information provided is accurate and I am authorized to initiate this onboarding request on behalf of <strong>{data.legalName}</strong>.
        </label>
      </div>

      <div className="flex justify-between pt-4">
        <Button type="button" variant="outline" onClick={onBack} disabled={isSubmitting}>Back</Button>
        <Button onClick={handleSubmit} size="lg" disabled={!confirmed || isSubmitting}>
          {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating SOW...</> : "Generate Statement of Work"}
        </Button>
      </div>
    </div>
  );
}