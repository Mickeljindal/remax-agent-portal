import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { KeyRound, User, Mail, Lock, Eye, EyeOff } from "lucide-react";
import remaxLogo from "@/assets/remax-excellence-logo.png";
import { callServerApi } from "@/lib/serverApi";
import { z } from "zod";

const loginRecoSchema = z.object({
  recoNumber: z.string().min(1, "RECO Number is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const signupSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  email: z.string().email("Invalid email address"),
  recoNumber: z.string().min(1, "RECO Number is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const Auth = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Login form state (RECO-derived email only)
  const [loginRecoNumber, setLoginRecoNumber] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginErrors, setLoginErrors] = useState<Record<string, string>>({});
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  
  // Signup form state
  const [signupFullName, setSignupFullName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupRecoNumber, setSignupRecoNumber] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");
  const [signupErrors, setSignupErrors] = useState<Record<string, string>>({});
  const [clientPreviewCode, setClientPreviewCode] = useState("");
  const [clientPreviewMode, setClientPreviewMode] = useState<"agent" | "admin">("agent");

  const expectedPreviewCode = (import.meta.env.VITE_CLIENT_PREVIEW_CODE as string | undefined)?.trim() || "remax-demo";

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session?.user) {
          navigate("/dashboard");
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        navigate("/dashboard");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginErrors({});

    try {
      loginRecoSchema.parse({ recoNumber: loginRecoNumber, password: loginPassword });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) errors[err.path[0] as string] = err.message;
        });
        setLoginErrors(errors);
        return;
      }
    }

    setLoading(true);

    const email = `${loginRecoNumber.toLowerCase().replace(/\s+/g, "")}@agent.portal`;

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: loginPassword,
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Login failed",
        description:
          error.message === "Invalid login credentials"
            ? "Invalid RECO number or password. Please try again."
            : error.message,
      });
    }

    setLoading(false);
  };

  const handleForgotPassword = async () => {
    const email = forgotEmail.trim();
    if (!email) {
      toast({ variant: "destructive", title: "Enter your email address" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth`,
    });
    setLoading(false);
    if (error) {
      toast({ variant: "destructive", title: "Request failed", description: error.message });
    } else {
      setForgotOpen(false);
      setForgotEmail("");
      toast({
        title: "Check your inbox",
        description: "If an account exists for this email, you will receive a reset link.",
      });
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupErrors({});
    
    try {
      signupSchema.parse({
        fullName: signupFullName,
        email: signupEmail,
        recoNumber: signupRecoNumber,
        password: signupPassword,
        confirmPassword: signupConfirmPassword,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            errors[err.path[0] as string] = err.message;
          }
        });
        setSignupErrors(errors);
        return;
      }
    }

    setLoading(true);

    // Create the account via the Node backend (auto-confirms the RECO-derived
    // email, creates the agent profile, and assigns the agent role — pending
    // admin activation). Runs on KloudBean, no Supabase edge deploy needed.
    const { error: fnError } = await callServerApi("register-agent", {
      recoNumber: signupRecoNumber,
      fullName: signupFullName,
      email: signupEmail,
      password: signupPassword,
    });

    if (fnError) {
      toast({
        variant: "destructive",
        title: "Registration Failed",
        description: fnError,
      });
    } else {
      toast({
        title: "Registration Successful",
        description: "Your account has been created. An administrator will activate your account shortly.",
      });
      // Clear the form
      setSignupFullName("");
      setSignupEmail("");
      setSignupRecoNumber("");
      setSignupPassword("");
      setSignupConfirmPassword("");
    }

    setLoading(false);
  };

  const handleClientPreviewLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (clientPreviewCode.trim() !== expectedPreviewCode) {
      toast({
        variant: "destructive",
        title: "Invalid preview code",
        description: "Please enter the correct client preview access code.",
      });
      return;
    }
    navigate(clientPreviewMode === "admin" ? "/preview?mode=admin" : "/preview");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary p-4 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.03%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')]" />
      
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/95 to-primary/90" />
      
      <Card className="relative z-10 w-full max-w-md overflow-hidden border-0 bg-white/95 text-card-foreground shadow-2xl shadow-[#1a1f36]/15 ring-1 ring-black/5 backdrop-blur-md">
        <CardHeader className="space-y-0 pb-4 pt-0 text-center">
          {/* Dark band only behind logo so white artwork stays visible */}
          <div className="-mx-6 -mt-px mb-5 bg-gradient-to-b from-[#1a1f36] to-[#232a4a] px-8 pb-7 pt-8">
            <div className="mx-auto max-w-[280px] rounded-xl bg-black/15 px-5 py-4 ring-1 ring-white/10">
              <img
                src={remaxLogo}
                alt="REMAX Excellence"
                className="mx-auto h-14 w-auto object-contain drop-shadow-sm"
              />
            </div>
          </div>
          <CardTitle className="font-display text-2xl font-bold text-[#1a1f36]">
            REMAX Excellence Canada
          </CardTitle>
          <CardDescription className="mt-2 text-muted-foreground">
            Agent Portal — sign in to access training, listings, and support
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-2">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="mb-6 grid w-full grid-cols-3">
              <TabsTrigger value="login">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Register</TabsTrigger>
              <TabsTrigger value="client-preview">Client Demo</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-reco" className="font-medium text-foreground">
                    RECO number
                  </Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="login-reco"
                      type="text"
                      autoComplete="username"
                      placeholder="Enter your RECO number"
                      value={loginRecoNumber}
                      onChange={(e) => setLoginRecoNumber(e.target.value)}
                      className="pl-10"
                      disabled={loading}
                    />
                  </div>
                  {loginErrors.recoNumber && (
                    <p className="text-sm text-destructive">{loginErrors.recoNumber}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="login-password" className="font-medium text-foreground">
                      Password
                    </Label>
                    <button
                      type="button"
                      className="text-xs text-primary underline-offset-4 hover:underline"
                      onClick={() => setForgotOpen(true)}
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="Enter your password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="pl-10 pr-10"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {loginErrors.password && (
                    <p className="text-sm text-destructive">{loginErrors.password}</p>
                  )}
                </div>

                <Button type="submit" className="w-full h-11 font-semibold" disabled={loading}>
                  {loading ? "Signing in..." : "Sign in"}
                </Button>
              </form>

              {forgotOpen && (
                <div className="mt-4 space-y-3 rounded-lg border border-border bg-muted/50 p-4">
                  <p className="text-sm font-medium text-foreground">Reset password</p>
                  <Input
                    type="email"
                    placeholder="Your account email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" className="flex-1" onClick={() => setForgotOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="button" className="flex-1" onClick={handleForgotPassword} disabled={loading}>
                      Send link
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name" className="font-medium text-foreground">
                    Full Name
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="Enter your full name"
                      value={signupFullName}
                      onChange={(e) => setSignupFullName(e.target.value)}
                      className="pl-10"
                      disabled={loading}
                    />
                  </div>
                  {signupErrors.fullName && (
                    <p className="text-sm text-destructive">{signupErrors.fullName}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="font-medium text-foreground">
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="Enter your email"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      className="pl-10"
                      disabled={loading}
                    />
                  </div>
                  {signupErrors.email && (
                    <p className="text-sm text-destructive">{signupErrors.email}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-reco" className="font-medium text-foreground">
                    RECO Number
                  </Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="signup-reco"
                      type="text"
                      placeholder="Enter your RECO number"
                      value={signupRecoNumber}
                      onChange={(e) => setSignupRecoNumber(e.target.value)}
                      className="pl-10"
                      disabled={loading}
                    />
                  </div>
                  {signupErrors.recoNumber && (
                    <p className="text-sm text-destructive">{signupErrors.recoNumber}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="font-medium text-foreground">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="signup-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a password"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      className="pl-10 pr-10"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {signupErrors.password && (
                    <p className="text-sm text-destructive">{signupErrors.password}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-confirm" className="font-medium text-foreground">
                    Confirm Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="signup-confirm"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm your password"
                      value={signupConfirmPassword}
                      onChange={(e) => setSignupConfirmPassword(e.target.value)}
                      className="pl-10 pr-10"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {signupErrors.confirmPassword && (
                    <p className="text-sm text-destructive">{signupErrors.confirmPassword}</p>
                  )}
                </div>
                
                <Button type="submit" className="w-full h-11 font-semibold" disabled={loading}>
                  {loading ? "Creating Account..." : "Create Account"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="client-preview">
              <form onSubmit={handleClientPreviewLogin} className="space-y-4">
                <div className="rounded-lg border border-dashed border-border bg-muted/40 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                  Special showcase access for client demos. This does not grant real admin permissions.
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client-preview-code" className="font-medium text-foreground">
                    Preview access code
                  </Label>
                  <Input
                    id="client-preview-code"
                    type="password"
                    placeholder="Enter demo code"
                    value={clientPreviewCode}
                    onChange={(e) => setClientPreviewCode(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-medium text-foreground">Preview type</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setClientPreviewMode("agent")}
                      className={`rounded-md border px-3 py-2 text-sm transition-colors ${
                        clientPreviewMode === "agent"
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/30 hover:bg-muted/50"
                      }`}
                    >
                      Agent Portal View
                    </button>
                    <button
                      type="button"
                      onClick={() => setClientPreviewMode("admin")}
                      className={`rounded-md border px-3 py-2 text-sm transition-colors ${
                        clientPreviewMode === "admin"
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/30 hover:bg-muted/50"
                      }`}
                    >
                      Admin Management View
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full h-11 font-semibold">
                  Open client demo
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
