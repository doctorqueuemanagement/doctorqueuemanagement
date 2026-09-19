import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <div className="max-w-3xl text-center">
        
        {/* Modern SaaS Badge */}
        <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-full text-xs font-bold mb-8 border border-indigo-100/50 shadow-sm">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
          </span>
          Next-Gen Queue Management
        </div>
        
        {/* Main Heading with Gradient */}
        <h1 className="text-5xl md:text-7xl font-black text-slate-900 mb-6 tracking-tight">
          Smart <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-sky-500">Queue</span> System
        </h1>
        
        <p className="text-lg md:text-xl text-slate-500 mb-10 max-w-2xl mx-auto font-medium">
          The most professional and seamless way to manage your clinic's patient queue. Keep your patients informed in real-time, reduce waiting room crowds, and focus on what matters most.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link 
            href="/login" 
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-8 rounded-full transition-all active:scale-[0.98] shadow-md hover:shadow-lg text-lg border border-indigo-700"
          >
            Doctor Login / Register
          </Link>
        </div>
      </div>

      <div className="mt-24 text-slate-400 text-sm font-bold uppercase tracking-widest">
        Designed for Modern Clinics & Hospitals
      </div>
    </div>
  );
}