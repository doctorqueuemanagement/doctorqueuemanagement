"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../utils/supabase";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const [doctorId, setDoctorId] = useState("");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const router = useRouter();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push("/login");
      return;
    }

    setDoctorId(session.user.id);

    const { data: queueData } = await supabase
      .from("queues")
      .select("full_name, username")
      .eq("doctor_id", session.user.id)
      .single();

    if (queueData) {
      setFullName(queueData.full_name);
      setUsername(queueData.username);
    }
    setLoading(false);
  };

  const updateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMessage(null);

    try {
      const formattedUsername = username.toLowerCase().replace(/[^a-z0-9]/g, "");

      const { data: existingUser } = await supabase
        .from("queues")
        .select("doctor_id")
        .eq("username", formattedUsername)
        .single();

      if (existingUser && existingUser.doctor_id !== doctorId) {
        throw new Error("This username is already taken by another clinic.");
      }

      const { error } = await supabase
        .from("queues")
        .update({ full_name: fullName, username: formattedUsername })
        .eq("doctor_id", doctorId);

      if (error) throw error;

      setUsername(formattedUsername);
      setProfileMessage({ type: "success", text: "Profile updated successfully!" });
    } catch (err: any) {
      setProfileMessage({ type: "error", text: err.message });
    } finally {
      setSavingProfile(false);
    }
  };

  const updatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPassword(true);
    setPasswordMessage(null);

    try {
      if (newPassword.length < 6) throw new Error("Password must be at least 6 characters.");

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      
      if (error) throw error;

      setNewPassword("");
      setPasswordMessage({ type: "success", text: "Password updated successfully!" });
    } catch (err: any) {
      setPasswordMessage({ type: "error", text: err.message });
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center bg-slate-50"><div className="w-8 h-8 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div></div>;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-8 px-4 sm:px-6">
      
      {/* Header - Mobile Responsive */}
      <div className="w-full max-w-3xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Settings</h1>
          <p className="text-slate-500 font-medium text-sm mt-0.5">Manage your clinic profile & security</p>
        </div>
        <button onClick={() => router.push("/dashboard")} className="w-full sm:w-auto bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold px-5 py-2.5 rounded-lg transition-all shadow-sm text-sm">
          ← Back to Dashboard
        </button>
      </div>

      <div className="w-full max-w-3xl flex flex-col gap-6">
        
        {/* Profile Settings */}
        <div className="bg-white rounded-2xl shadow-sm p-6 sm:p-8 border border-slate-200">
          <h2 className="text-lg font-bold text-slate-900 mb-6">Clinic Profile</h2>
          
          {profileMessage && (
            <div className={`p-4 rounded-xl text-sm mb-6 font-semibold ${profileMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
              {profileMessage.text}
            </div>
          )}

          <form onSubmit={updateProfile} className="flex flex-col gap-5">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Full Name</label>
              <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required className="w-full px-4 py-3 rounded-xl bg-slate-50 border-2 border-slate-200 focus:bg-white focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-slate-900 font-semibold text-sm" />
            </div>
            
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Unique Username (Patient Link)</label>
              <div className="flex items-center">
                <span className="px-4 py-3 bg-slate-100 border-2 border-r-0 border-slate-200 rounded-l-xl text-slate-500 text-sm font-medium">site.com/</span>
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required className="w-full px-4 py-3 rounded-r-xl bg-slate-50 border-2 border-slate-200 focus:bg-white focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-slate-900 font-semibold text-sm lowercase" />
              </div>
              <p className="text-xs font-semibold text-amber-600 mt-2 bg-amber-50 inline-block px-3 py-1.5 rounded-md border border-amber-100">⚠️ Changing this will break previously shared QR codes.</p>
            </div>

            <div className="mt-2 flex justify-end">
              <button type="submit" disabled={savingProfile} className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-xl transition-all active:scale-[0.98] disabled:opacity-70 shadow-sm text-sm">
                {savingProfile ? "Saving..." : "Save Profile"}
              </button>
            </div>
          </form>
        </div>

        {/* Security Settings */}
        <div className="bg-white rounded-2xl shadow-sm p-6 sm:p-8 border border-slate-200">
          <h2 className="text-lg font-bold text-slate-900 mb-6">Security</h2>
          
          {passwordMessage && (
            <div className={`p-4 rounded-xl text-sm mb-6 font-semibold ${passwordMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
              {passwordMessage.text}
            </div>
          )}

          <form onSubmit={updatePassword} className="flex flex-col gap-5">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">New Password</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} placeholder="Enter new password" className="w-full px-4 py-3 rounded-xl bg-slate-50 border-2 border-slate-200 focus:bg-white focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-slate-900 font-semibold text-sm" />
            </div>

            <div className="mt-2 flex justify-end">
              <button type="submit" disabled={savingPassword} className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-8 rounded-xl transition-all active:scale-[0.98] disabled:opacity-70 shadow-sm text-sm">
                {savingPassword ? "Updating..." : "Update Password"}
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}