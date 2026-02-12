import type { Metadata } from "next";
import { TvGrid } from "@/components/tv-grid";
import { Clock, MapPin, Store } from "lucide-react";

export const metadata: Metadata = {
  title: "PlayStation Rental - Live Status",
  description: "Real-time status monitoring for PlayStation rental units",
};

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden">
      {/* Ambient background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent" />

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-white/10 backdrop-blur-xl bg-slate-950/70">
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
            {/* Store Profile Section */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              {/* Left: Store Info */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/20">
                    <Store className="h-6 w-6 text-white" />
                  </div>
                  <div className="space-y-1">
                    <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent">
                      PlayStation Rental
                    </h1>
                    <p className="text-sm text-slate-400">
                      Live unit monitoring
                    </p>
                  </div>
                </div>

                {/* Store Details */}
                <div className="flex flex-wrap gap-6">
                  {/* Operating Hours */}
                  <div className="flex items-start gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800/50 border border-slate-700/50">
                      <Clock className="h-4 w-4 text-cyan-400" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">
                        Jam Operasional
                      </p>
                      <p className="text-sm text-slate-300 font-semibold">
                        09:00 - 22:00 WIB
                      </p>
                    </div>
                  </div>

                  {/* Address */}
                  <div className="flex items-start gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800/50 border border-slate-700/50">
                      <MapPin className="h-4 w-4 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">
                        Alamat
                      </p>
                      <p className="text-sm text-slate-300 font-semibold max-w-xs">
                        Jl. Raya Utama No. 123, Pusat Perbelanjaan, Jakarta
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Live Indicator */}
              <div className="flex items-center gap-3 px-5 py-3 rounded-full bg-slate-900/60 border border-emerald-500/30 backdrop-blur-sm">
                <span className="flex h-3 w-3 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-sm font-semibold text-emerald-400">
                  LIVE STATUS
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Main content */}
        <section className="max-w-7xl mx-auto px-4 md:px-8 py-12">
          <TvGrid />
        </section>
      </div>
    </main>
  );
}
