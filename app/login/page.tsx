"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../utils/supabase";

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");

  const router = useRouter();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(null); setSuccess(null);

    try {
      if (isForgotPassword) {
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        if (error) throw error;
        setSuccess("Password reset link sent to your email.");
        return;
      }

      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/dashboard");
      } else {
        const formattedUsername = username.toLowerCase().replace(/[^a-z0-9]/g, "");
        const { data: existingUser } = await supabase.from("queues").select("username").eq("username", formattedUsername).single();
        if (existingUser) throw new Error("This username is already taken. Please try another.");

        const { error: authError } = await supabase.auth.signUp({ 
          email, password, options: { data: { full_name: fullName, username: formattedUsername } }
        });
        if (authError) throw authError;

        setSuccess("Account created! Please check your email to confirm.");
        setEmail(""); setPassword(""); setFullName(""); setUsername("");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 sm:p-12 w-full max-w-md border border-zinc-200/60">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight mb-2">
            {isForgotPassword ? "Reset Password" : isLogin ? "Sign in to Dashboard" : "Create your account"}
          </h1>
          <p className="text-zinc-500 text-sm">
            {isForgotPassword ? "We'll send you a link to reset it." : isLogin ? "Welcome back. Enter your details." : "Start managing your clinic queue efficiently."}
          </p>
        </div>

        {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6 border border-red-100">{error}</div>}
        {success && <div className="bg-emerald-50 text-emerald-700 p-3 rounded-lg text-sm mb-6 border border-emerald-100">{success}</div>}

        <form onSubmit={handleAuth} className="flex flex-col gap-5">
          {!isLogin && !isForgotPassword && (
            <>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">Full Name</label>
                <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required className="w-full px-4 py-2.5 rounded-xl bg-zinc-50/50 border border-zinc-200 focus:bg-white focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 outline-none transition-all text-zinc-900" placeholder="Dr. John Doe" />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">Clinic URL Username</label>
                <div className="flex items-center">
                  <span className="px-3 py-2.5 bg-zinc-100 border border-r-0 border-zinc-200 rounded-l-xl text-zinc-500 text-sm">q.com/</span>
                  <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required className="w-full px-4 py-2.5 rounded-r-xl bg-zinc-50/50 border border-zinc-200 focus:bg-white focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 outline-none transition-all text-zinc-900 lowercase" placeholder="drjohndoe" />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1.5">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full px-4 py-2.5 rounded-xl bg-zinc-50/50 border border-zinc-200 focus:bg-white focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 outline-none transition-all text-zinc-900" placeholder="doctor@clinic.com" />
          </div>

          {!isForgotPassword && (
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-sm font-medium text-zinc-700">Password</label>
                {isLogin && <button type="button" onClick={() => setIsForgotPassword(true)} className="text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors">Forgot password?</button>}
              </div>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="w-full px-4 py-2.5 rounded-xl bg-zinc-50/50 border border-zinc-200 focus:bg-white focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 outline-none transition-all text-zinc-900" placeholder="••••••••" />
            </div>
          )}

          <button type="submit" disabled={loading} className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-medium py-3 rounded-xl transition-all active:scale-[0.98] disabled:opacity-70 mt-2 shadow-sm">
            {loading ? "Processing..." : isForgotPassword ? "Send Reset Link" : isLogin ? "Sign In" : "Create Account"}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-zinc-100 text-center">
          <button onClick={() => { setIsLogin(!isLogin); setIsForgotPassword(false); setError(null); setSuccess(null); }} className="text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors">
            {isForgotPassword ? "Back to sign in" : isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}