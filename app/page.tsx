'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Store, Languages, PackageCheck, ArrowDown } from 'lucide-react';
import HeroOrb from '@/components/HeroOrb';
import AuthModal from '@/components/AuthModal';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/lib/auth/AuthContext';

export default function DayNightLandingPage() {
  const { setIsAuthModalOpen, isAuthModalOpen, user } = useAuth();

  return (
    <div className="min-h-screen w-full bg-pitch-black text-zinc-100 selection:bg-[#e5c178] selection:text-black">
      {/* Top Navbar */}
      <Navbar />


      {/* Main Hero Container */}
      <section className="w-full px-4 sm:px-8 lg:px-12 pt-8 pb-16">
        <div className="w-full rounded-[32px] border border-zinc-800/60 bg-[#09090d]/90 p-8 sm:p-14 lg:p-16 glass-panel-dark">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">

            {/* Hero Left Content */}
            <div className="lg:col-span-7 space-y-8">
              {/* Badge Pill */}
              <div className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-950 px-4 py-1.5 text-[11px] font-medium text-zinc-400">
                <span className="h-1.5 w-1.5 rounded-full bg-[#e5c178]" />
                <span className="uppercase tracking-widest font-mono text-[10px] text-zinc-300">AGENTIC COMMERCE • BHARAT / RAZORPAY Q1</span>
              </div>

              {/* Main Headline */}
              <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl lg:text-7xl xl:text-8xl leading-[1.05]">
                Build faster. <br />
                Convert better. <br />
                <span className="serif-gold text-5xl sm:text-7xl lg:text-8xl xl:text-9xl font-normal">Scale</span> with AI.
              </h1>

              {/* Description */}
              <p className="max-w-2xl text-base sm:text-lg text-zinc-400 leading-relaxed font-normal">
                We combine agentic catalog normalization, Hindi & Hinglish voice AI, and bounded Razorpay checkout so Indian merchants sell more, convert AI buyers, and automate commerce with zero manual effort.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-4 pt-2">
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className="btn-ivory rounded-full px-7 py-3.5 text-xs font-bold inline-flex items-center gap-2 shadow-xl cursor-pointer"
                >
                  <span>Launch Platform</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>

              {/* Bottom Metrics Bar */}
              <div className="pt-10 border-t border-zinc-800/80 grid grid-cols-2 sm:grid-cols-4 gap-6 text-left">
                <div>
                  <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">EST.</div>
                  <div className="text-base font-bold text-white mt-1">2026</div>
                </div>
                <div>
                  <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">FOCUS</div>
                  <div className="text-base font-bold text-white mt-1">Agentic Growth</div>
                </div>
                <div>
                  <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">AVG. LIFT</div>
                  <div className="text-base font-bold text-[#e5c178] mt-1">312% conversion</div>
                </div>
                <div>
                  <a href="#operating-system" className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-300 hover:text-white pt-2">
                    <span>See results</span>
                    <ArrowDown className="h-3.5 w-3.5 text-[#e5c178]" />
                  </a>
                </div>
              </div>
            </div>

            {/* Hero Right 3D Particle Orb */}
            <div className="lg:col-span-5 flex justify-center items-center">
              <div className="w-full max-w-[550px] aspect-square">
                <HeroOrb />
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Section 2: THE OPERATING SYSTEM */}
      <section id="operating-system" className="w-full px-6 sm:px-12 lg:px-16 py-24 border-t border-zinc-900">
        <div className="w-full space-y-16">
          {/* Section Header */}
          <div className="space-y-4">
            <div className="text-[11px] font-mono font-bold tracking-widest text-[#e5c178] uppercase">
              THE OPERATING SYSTEM
            </div>
            <h2 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-tight">
              From a messy catalog <br />
              to a <span className="serif-gold text-5xl sm:text-7xl lg:text-8xl font-normal">clear answer.</span>
            </h2>
          </div>

          {/* 3 Step Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Card 01 */}
            <div className="rounded-3xl border border-zinc-800/80 bg-[#09090d] p-10 space-y-8 hover:border-[#e5c178]/40 transition-all">
              <div className="flex items-center justify-between text-zinc-500 font-mono text-sm">
                <span>01</span>
                <Store className="h-6 w-6 text-[#e5c178]" />
              </div>
              <div className="space-y-3">
                <h3 className="text-2xl font-bold text-white">Seller publishes</h3>
                <p className="text-sm sm:text-base text-zinc-400 leading-relaxed">
                  Products, policies and proof become structured context an agent can trust with zero hallucination.
                </p>
              </div>
              <div className="pt-4">
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className="text-xs font-semibold text-[#e5c178] hover:underline flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Explore Seller Normalizer</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Card 02 */}
            <div className="rounded-3xl border border-zinc-800/80 bg-[#09090d] p-10 space-y-8 hover:border-[#e5c178]/40 transition-all">
              <div className="flex items-center justify-between text-zinc-500 font-mono text-sm">
                <span>02</span>
                <Languages className="h-6 w-6 text-[#e5c178]" />
              </div>
              <div className="space-y-3">
                <h3 className="text-2xl font-bold text-white">Buyer speaks</h3>
                <p className="text-sm sm:text-base text-zinc-400 leading-relaxed">
                  A natural Hindi, Hinglish or English conversation reveals the real need with Voice STT integration.
                </p>
              </div>
              <div className="pt-4">
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className="text-xs font-semibold text-[#e5c178] hover:underline flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Try Voice Assistant</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Card 03 */}
            <div className="rounded-3xl border border-zinc-800/80 bg-[#09090d] p-10 space-y-8 hover:border-[#e5c178]/40 transition-all">
              <div className="flex items-center justify-between text-zinc-500 font-mono text-sm">
                <span>03</span>
                <PackageCheck className="h-6 w-6 text-[#e5c178]" />
              </div>
              <div className="space-y-3">
                <h3 className="text-2xl font-bold text-white">Checkout lands</h3>
                <p className="text-sm sm:text-base text-zinc-400 leading-relaxed">
                  Recommendations stay explainable. Every money action is bounded and visible via Razorpay Test API.
                </p>
              </div>
              <div className="pt-4">
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className="text-xs font-semibold text-[#e5c178] hover:underline flex items-center gap-1.5 cursor-pointer"
                >
                  <span>View Governance Logs</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: Commerce that speaks human */}
      <section className="w-full px-6 sm:px-12 lg:px-16 py-20 border-t border-zinc-900">
        <div className="w-full rounded-3xl border border-zinc-800/60 bg-[#09090d] p-10 sm:p-16 lg:p-20 flex flex-col md:flex-row md:items-center justify-between gap-10">
          <div className="space-y-4 max-w-2xl">
            <div className="text-[11px] font-mono font-bold tracking-widest text-[#e5c178] uppercase">
              BUILT FOR THE NEXT BUYER
            </div>
            <h2 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-tight">
              Commerce that <br />
              <span className="serif-gold text-5xl sm:text-7xl lg:text-8xl font-normal">speaks human.</span>
            </h2>
          </div>

          <div>
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="btn-ivory rounded-full px-10 py-5 text-sm font-semibold inline-flex items-center gap-3 shadow-2xl cursor-pointer"
            >
              <span>Choose your path</span>
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full border-t border-zinc-900 bg-pitch-black py-10 px-6 sm:px-12 lg:px-16 text-xs text-zinc-500">
        <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>SHOPAGENT © 2026</div>
          <div className="font-mono uppercase tracking-widest text-[10px] text-zinc-400">
            AGENT-READY BY DESIGN / BUILT FOR BHARAT
          </div>
          <div>RAZORPAY TEST MODE READY</div>
        </div>
      </footer>

      {/* Sign In / Sign Up Auth Modal Popup */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </div>
  );
}
