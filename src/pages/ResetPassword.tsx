import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { isRecoveryHash } from "@/lib/recovery";
import { z } from "zod";
import { Lock, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import remaxLogo from "@/assets/remax-excellence-logo.png";

const resetSchema = z
  .object({
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

/**
 * Landing page for the reset link emailed by /api/forgot-password.
 * The one-time token is only redeemed when the agent submits the form, so
 * email security scanners that pre-open links can't use it up.
 */
const ResetPassword = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const tokenHash = params.get("token_hash");
  const type = params.get("type");
  // Mode 1: our own email link (?token_hash=...&type=recovery) — redeemed on submit.
  const tokenMode = !!tokenHash && type === "recovery";
  // Mode 2: Supabase-hosted link (#access_token=...&type=recovery) — the
  // Supabase client turns the hash into a recovery session, then clears it,
  // so capture it once on first render.
  const [sessionMode] = useState(() => !tokenMode && isRecoveryHash(window.location.hash));
  const hasValidLink = tokenMode || sessionMode;

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    if (!sessionMode) return;
    let cancelled = false;
    // getSession() waits for the client to finish processing the URL hash.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      if (session) setSessionReady(true);
      else setLinkError("This reset link is invalid or has expired. Please request a new one.");
    });
    return () => {
      cancelled = true;
    };
  }, [sessionMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const parsed = resetSchema.safeParse({ password, confirmPassword });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      parsed.error.errors.forEach((err) => {
        if (err.path[0]) next[err.path[0] as string] = err.message;
      });
      setErrors(next);
      return;
    }

    if (!tokenMode && !sessionReady) return;
    setLoading(true);

    // 1) Token links: redeem the one-time recovery token → short-lived session.
    //    (Session links already have that session from the URL hash.)
    if (tokenMode && tokenHash) {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: "recovery",
      });
      if (verifyError) {
        setLoading(false);
        setLinkError("This reset link is invalid or has expired. Please request a new one.");
        return;
      }
    }

    // 2) Set the new password on that session.
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setLoading(false);
      toast({ variant: "destructive", title: "Couldn't update password", description: updateError.message });
      return;
    }

    // 3) Sign out so the agent logs in fresh with the new password.
    await supabase.auth.signOut();
    setLoading(false);
    toast({ title: "Password updated", description: "You can now sign in with your new password." });
    navigate("/auth", { replace: true });
  };

  const invalid = !hasValidLink || !!linkError;

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/95 to-primary/90" />

      <Card className="relative z-10 w-full max-w-md overflow-hidden border-0 bg-white/95 text-card-foreground shadow-2xl shadow-[#1a1f36]/15 ring-1 ring-black/5 backdrop-blur-md">
        <CardHeader className="space-y-0 pb-4 pt-0 text-center">
          <div className="-mx-6 -mt-px mb-5 bg-gradient-to-b from-[#1a1f36] to-[#232a4a] px-8 pb-7 pt-8">
            <div className="mx-auto max-w-[280px] rounded-xl bg-black/15 px-5 py-4 ring-1 ring-white/10">
              <img src={remaxLogo} alt="REMAX Excellence" className="mx-auto h-14 w-auto object-contain drop-shadow-sm" />
            </div>
          </div>
          <CardTitle className="font-display text-2xl font-bold text-[#1a1f36]">Set a new password</CardTitle>
          <CardDescription className="mt-2 text-muted-foreground">
            {invalid ? "There's a problem with this reset link." : "Choose a new password for your agent account."}
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-2">
          {invalid ? (
            <div className="space-y-4">
              <p role="alert" className="text-sm text-destructive">
                {linkError || "This reset link is incomplete. Please use the full link from your email, or request a new one."}
              </p>
              <Button className="w-full h-11 font-semibold" onClick={() => navigate("/auth")}>
                Back to sign in
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="new-password" className="font-medium text-foreground">
                  New password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                  <Input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Enter a new password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                    disabled={loading}
                    aria-invalid={!!errors.password}
                    aria-describedby={errors.password ? "new-password-error" : undefined}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p id="new-password-error" className="text-sm text-destructive">{errors.password}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-new-password" className="font-medium text-foreground">
                  Confirm new password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                  <Input
                    id="confirm-new-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Re-enter the new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10"
                    disabled={loading}
                    aria-invalid={!!errors.confirmPassword}
                    aria-describedby={errors.confirmPassword ? "confirm-new-password-error" : undefined}
                  />
                </div>
                {errors.confirmPassword && (
                  <p id="confirm-new-password-error" className="text-sm text-destructive">{errors.confirmPassword}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-11 font-semibold"
                disabled={loading || (sessionMode && !sessionReady)}
              >
                {sessionMode && !sessionReady ? "Verifying link..." : loading ? "Updating..." : "Update password"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
