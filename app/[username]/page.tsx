"use client";
import { useEffect, useState, use, useRef } from "react";
import { supabase } from "../../utils/supabase";

export default function PatientView({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params);
  const [data, setData] = useState<{ full_name: string; current_number: number; doctor_id: string } | null>(null);
  const [notFound, setNotFound] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(false);
  
  const soundEnabledRef = useRef(soundEnabled);
  useEffect(() => { soundEnabledRef.current = soundEnabled; }, [soundEnabled]);

  useEffect(() => {
    const fetchAndSubscribe = async () => {
      const { data: queueData, error } = await supabase.from("queues").select("full_name, current_number, doctor_id").eq("username", username).single();
      if (error || !queueData) { setNotFound(true); return; }

      setData(queueData);

      const channel = supabase.channel(`queue-${queueData.doctor_id}`).on("postgres_changes",
          { event: "UPDATE", schema: "public", table: "queues", filter: `doctor_id=eq.${queueData.doctor_id}` },
          (payload) => {
            if (audioRef.current && soundEnabledRef.current) {
              audioRef.current.currentTime = 0; 
              audioRef.current.play().catch(e => console.error("Audio blocked", e));
            }
            setData((prev) => prev ? { ...prev, current_number: payload.new.current_number } : null);
          }
        ).subscribe();

      return () => { supabase.removeChannel(channel); };
    };
    fetchAndSubscribe();
  }, [username]);

  if (notFound) return <div className="flex h-screen items-center justify-center bg-slate-50 text-slate-500 font-bold">Clinic Not Found</div>;
  if (!data) return <div className="flex h-screen items-center justify-center bg-slate-50"><div className="w-8 h-8 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div></div>;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <audio ref={audioRef} src="/ding.mp3" preload="auto" />

      <div className="w-full max-w-sm flex flex-col items-center text-center">
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-800 px-4 py-1.5 rounded-full text-xs font-bold mb-6 border border-emerald-200 shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
            </span>
            Live Updates Active
          </div>
          <h2 className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-2">Now Serving At</h2>
          <h1 className="text-slate-900 text-3xl font-black tracking-tight">{data.full_name}</h1>
        </div>

        <div className="w-full bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.08)] border-2 border-slate-100 p-10 mb-8 flex flex-col items-center transform transition-all hover:scale-[1.02]">
          <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-4">Token Number</p>
          <div className="text-[9rem] font-black text-indigo-900 leading-none tracking-tighter tabular-nums pb-2">
            {data.current_number}
          </div>
        </div>

        <button 
          onClick={() => setSoundEnabled(!soundEnabled)}
          className={`px-6 py-3.5 rounded-full font-bold text-sm transition-all border-2 shadow-sm flex items-center gap-2 ${
            soundEnabled 
              ? "bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700" 
              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
          }`}
        >
          {soundEnabled ? "🔊 Notifications On" : "🔈 Tap to Unmute Alerts"}
        </button>
      </div>
    </div>
  );
}