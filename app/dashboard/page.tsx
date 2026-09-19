"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../utils/supabase";

export default function DoctorDashboard() {
  const [number, setNumber] = useState<number>(0);
  const [totalPatients, setTotalPatients] = useState<number>(0);
  const [totalTimeSpent, setTotalTimeSpent] = useState<number>(0);
  const [lastCalledAt, setLastCalledAt] = useState<string | null>(null);
  const [profile, setProfile] = useState<{ username: string; full_name: string; doctor_id: string } | null>(null);
  
  const [isEditingTotal, setIsEditingTotal] = useState(false);
  const [tempTotal, setTempTotal] = useState("");
  
  const [showWarning, setShowWarning] = useState(false);
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [modalInput, setModalInput] = useState("");
  const [copySuccess, setCopySuccess] = useState(false);
  
  const hasPromptedRef = useRef(false);
  const [origin, setOrigin] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
    fetchProfileAndQueue();
  }, []);

  const fetchProfileAndQueue = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push("/login"); return; }

    const { data: queueData } = await supabase.from("queues").select("*").eq("doctor_id", session.user.id).single();
    if (queueData) {
      setProfile(queueData); setNumber(queueData.current_number || 0);
      setTotalPatients(queueData.total_patients || 0); setTotalTimeSpent(queueData.total_time_spent_seconds || 0);
      setLastCalledAt(queueData.last_called_at);
    }
  };

  const saveTotalToDb = async (newTotal: number) => {
    if (!profile) return;
    setTotalPatients(newTotal);
    await supabase.from("queues").update({ total_patients: newTotal }).eq("doctor_id", profile.doctor_id);
  };

  const handleManualTotalUpdate = async () => {
    const newTotal = parseInt(tempTotal);
    if (isNaN(newTotal) || newTotal < 0) return;
    await saveTotalToDb(newTotal);
    setIsEditingTotal(false);
  };

  const proceedNext = async () => {
    if (!profile) return;
    const newNum = number + 1;
    const now = new Date().toISOString();
    
    let addedTime = 0;
    if (number > 0 && lastCalledAt) {
      const diffInSeconds = Math.floor((new Date(now).getTime() - new Date(lastCalledAt).getTime()) / 1000);
      if (diffInSeconds < 1800) { addedTime = diffInSeconds; } 
      else { addedTime = number > 1 ? Math.floor(totalTimeSpent / (number - 1)) : 0; }
    }

    const newTotalTime = totalTimeSpent + addedTime;
    setNumber(newNum); setLastCalledAt(now); setTotalTimeSpent(newTotalTime);

    await supabase.from("queues").update({ 
      current_number: newNum, last_called_at: now, total_time_spent_seconds: newTotalTime
    }).eq("doctor_id", profile.doctor_id);
  };

  const handleNextPatient = () => {
    if (totalPatients === 0 && !hasPromptedRef.current && number === 0) {
      setShowPromptModal(true);
      return;
    }
    if (totalPatients === 0) {
      setShowWarning(true);
      setTimeout(() => setShowWarning(false), 3500);
      return;
    }
    proceedNext();
  };

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(modalInput);
    if (!isNaN(val) && val > 0) await saveTotalToDb(val);
    hasPromptedRef.current = true;
    setShowPromptModal(false);
    proceedNext();
  };

  const handleModalSaveOnly = async () => {
    const val = parseInt(modalInput);
    if (!isNaN(val) && val > 0) await saveTotalToDb(val);
    hasPromptedRef.current = true;
    setShowPromptModal(false);
  };

  const handleModalSkip = () => {
    hasPromptedRef.current = true;
    setShowPromptModal(false);
    proceedNext();
  };

  const prevNumber = async () => {
    if (!profile || number <= 0) return;
    setNumber(number - 1);
    await supabase.from("queues").update({ current_number: number - 1 }).eq("doctor_id", profile.doctor_id);
  };

  const triggerReset = () => setShowResetConfirm(true);

  const confirmReset = async () => {
    if (!profile) return;
    setShowResetConfirm(false);
    setNumber(0); setTotalPatients(0); setTotalTimeSpent(0); setLastCalledAt(null);
    hasPromptedRef.current = false;
    await supabase.from("queues").update({ 
      current_number: 0, total_patients: 0, total_time_spent_seconds: 0, last_called_at: null 
    }).eq("doctor_id", profile.doctor_id);
  };

  const logout = async () => { await supabase.auth.signOut(); router.push("/login"); };

  const handleCopyLink = () => {
    const patientLink = origin ? `${origin}/${profile?.username}` : "";
    navigator.clipboard.writeText(patientLink);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  // QR Code Download Logic
  const downloadQRCode = async () => {
    if (!qrCodeUrl || !profile) return;
    try {
      const response = await fetch(qrCodeUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `${profile.username}-queue-qr.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Error downloading QR:", error);
      alert("Failed to download QR code.");
    }
  };

  // Native Device Share Logic
  const shareLink = async () => {
    if (!patientLink || !profile) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${profile.full_name} - Live Queue`,
          text: `Track your queue status live at ${profile.full_name}'s clinic.`,
          url: patientLink,
        });
      } catch (error) {
        console.error("Error sharing:", error);
      }
    } else {
      alert("Sharing is not supported on this device. Please copy the link instead.");
    }
  };

  if (!profile) return <div className="flex h-screen items-center justify-center bg-slate-50"><div className="w-8 h-8 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div></div>;

  const patientLink = origin ? `${origin}/${profile.username}` : "";
  const qrCodeUrl = patientLink ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(patientLink)}&margin=10` : "";
  
  const waitingPatients = Math.max(0, totalPatients - number);
  const avgTimeMinutes = number > 1 ? Math.round((totalTimeSpent / (number - 1)) / 60) : 0;
  const estimatedMinutesLeft = waitingPatients * avgTimeMinutes;
  const completionTime = new Date(new Date().getTime() + estimatedMinutesLeft * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-8 px-4 sm:px-6 relative">
      
      <div className={`fixed top-8 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${showWarning ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-8 scale-95 pointer-events-none'}`}>
        <div className="bg-slate-900/95 backdrop-blur-md text-white px-6 py-3.5 rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.2)] flex items-center gap-3 border border-slate-700">
          <div className="bg-amber-500/20 text-amber-400 p-1.5 rounded-full">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
          </div>
          <p className="font-medium text-sm">Please set the <span className="font-bold text-amber-400">Total Patients</span> count first!</p>
        </div>
      </div>

      <div className="w-full max-w-5xl flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Overview</h1>
          <p className="text-slate-500 font-medium text-sm mt-0.5">{profile.full_name}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => router.push("/settings")} className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold px-4 py-2 text-sm rounded-lg transition-all shadow-sm">
            ⚙️ Settings
          </button>
          <button onClick={logout} className="bg-white border border-red-200 text-red-600 hover:bg-red-50 font-semibold px-4 py-2 text-sm rounded-lg transition-all shadow-sm">
            Logout
          </button>
        </div>
      </div>

      <div className="w-full max-w-5xl grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col hover:shadow-md transition-shadow">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-3">Total Patients</p>
          {isEditingTotal ? (
            <div className="flex gap-2 mt-auto">
              <input type="number" value={tempTotal} onChange={(e) => setTempTotal(e.target.value)} className="w-16 px-2 py-1 border-2 border-indigo-200 focus:border-indigo-500 rounded-md outline-none text-slate-900 text-sm font-semibold" />
              <button onClick={handleManualTotalUpdate} className="bg-indigo-600 text-white px-3 py-1 rounded-md text-xs font-bold hover:bg-indigo-700">Save</button>
            </div>
          ) : (
            <div className="flex items-end justify-between mt-auto">
              <p className="text-3xl font-bold text-slate-900">{totalPatients || "-"}</p>
              <button onClick={() => { setTempTotal(totalPatients.toString()); setIsEditingTotal(true); }} className="text-indigo-500 hover:text-indigo-700 text-xs font-bold pb-1 transition-colors">EDIT</button>
            </div>
          )}
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col hover:shadow-md transition-shadow">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-3">Waiting</p>
          <p className="text-3xl font-bold text-sky-600 mt-auto">{totalPatients === 0 ? "-" : waitingPatients}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col hover:shadow-md transition-shadow">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-3">Avg. Time</p>
          <p className="text-3xl font-bold text-purple-600 mt-auto">{avgTimeMinutes === 0 ? "-" : `${avgTimeMinutes}m`}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col hover:shadow-md transition-shadow">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-3">Est. Finish</p>
          <p className="text-3xl font-bold text-emerald-600 mt-auto">{(waitingPatients === 0 || avgTimeMinutes === 0) ? "-" : completionTime}</p>
        </div>
      </div>

      <div className="w-full max-w-5xl grid md:grid-cols-5 gap-6">
        <div className="md:col-span-3 bg-white rounded-2xl shadow-sm p-6 sm:p-8 border border-slate-200 flex flex-col">
          <p className="text-slate-900 font-bold mb-4">Queue Control</p>
          <div className="flex-1 bg-indigo-50 rounded-2xl border-2 border-indigo-100 flex flex-col items-center justify-center py-10 mb-6">
            <p className="text-indigo-600 font-bold uppercase tracking-widest text-xs mb-2">Currently Serving</p>
            <div className="text-8xl sm:text-9xl font-black text-indigo-950 tracking-tighter tabular-nums leading-none">{number}</div>
          </div>
          <div className="flex gap-4 mb-4">
            <button onClick={prevNumber} disabled={number === 0} className="w-1/3 bg-white border-2 border-slate-200 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 text-slate-700 font-bold py-4 rounded-xl transition-all active:scale-[0.98]">
              Previous
            </button>
            <button onClick={handleNextPatient} className="w-2/3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl transition-all active:scale-[0.98] shadow-md hover:shadow-lg">
              Call Next Patient
            </button>
          </div>
          <button onClick={triggerReset} className="w-full bg-white text-slate-500 hover:text-red-600 hover:bg-red-50 font-bold py-3 rounded-xl transition-colors text-sm border border-transparent hover:border-red-100">
            End Day & Reset Queue
          </button>
        </div>

        <div className="md:col-span-2 bg-white rounded-2xl shadow-sm p-6 sm:p-8 border border-slate-200 flex flex-col items-center justify-center text-center">
          <p className="text-slate-900 font-bold mb-1 w-full text-left">Share Tracker</p>
          <p className="text-slate-500 font-medium text-sm mb-6 w-full text-left">Patients scan to track queue live.</p>
          
          <div className="bg-white p-3 rounded-2xl border-2 border-slate-100 shadow-sm mb-4">
            {qrCodeUrl && <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48" crossOrigin="anonymous" />}
          </div>
          
          {/* Action Buttons for QR/Link */}
          <div className="flex gap-2 w-full max-w-[216px] mb-6">
            <button onClick={downloadQRCode} className="w-1/2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl transition-all text-xs flex items-center justify-center gap-1.5 shadow-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
              Save QR
            </button>
            <button onClick={shareLink} className="w-1/2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold py-2.5 rounded-xl transition-all text-xs flex items-center justify-center gap-1.5 shadow-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path></svg>
              Share
            </button>
          </div>

          <div className="w-full">
            <div className="flex bg-slate-50 border-2 border-slate-200 rounded-xl overflow-hidden focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/20 transition-all p-1">
              <input type="text" readOnly value={patientLink} className="w-full bg-transparent px-3 py-2 text-slate-700 font-semibold outline-none text-sm" />
              <button onClick={handleCopyLink} className={`px-4 py-2 rounded-lg font-bold transition-all active:scale-[0.98] text-sm shadow-sm ${copySuccess ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-100 text-indigo-600'}`}>
                {copySuccess ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {showResetConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl border border-slate-100 transform transition-all animate-in fade-in zoom-in duration-200">
            <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center text-2xl mb-4 font-bold">
              ⚠️
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Reset Queue?</h3>
            <p className="text-slate-500 text-sm mb-6">
              Are you sure you want to end the day and reset all queue analytics to zero? This action cannot be undone.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setShowResetConfirm(false)} className="w-1/2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl transition-all text-sm">
                Cancel
              </button>
              <button onClick={confirmReset} className="w-1/2 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-all text-sm shadow-md">
                Yes, Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {showPromptModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl border border-slate-100 transform transition-all animate-in fade-in zoom-in duration-200">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center text-2xl mb-4 font-bold">
              📋
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Today's Appointments</h3>
            <p className="text-slate-500 text-sm mb-6">
              How many patients are scheduled for today? This helps calculate estimated completion times.
            </p>
            <form onSubmit={handleModalSubmit} className="flex flex-col gap-3">
              <input type="number" autoFocus value={modalInput} onChange={(e) => setModalInput(e.target.value)} placeholder="e.g. 45" className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-indigo-500 outline-none text-slate-900 font-bold text-lg text-center mb-1" />
              <div className="flex gap-2">
                <button type="button" onClick={handleModalSkip} className="w-1/2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl transition-all text-sm">
                  Skip for Now
                </button>
                <button type="button" onClick={handleModalSaveOnly} className="w-1/2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-bold py-3 rounded-xl transition-all text-sm">
                  Save
                </button>
              </div>
              <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-all text-sm shadow-md mt-1">
                Save & Call
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}