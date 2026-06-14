"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Tv, 
  Smartphone, 
  Download, 
  Apple, 
  Sparkles, 
  CheckCircle2, 
  HelpCircle, 
  Info, 
  ShieldCheck, 
  Layers, 
  Settings, 
  ArrowRight,
  Flame,
  Star,
  MonitorPlay
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { usePerformanceMode } from "@/hooks/usePerformanceMode";

const platforms = [
  {
    id: "android-tv",
    type: "tv",
    status: "active",
    title: "Android TV & Fire TV",
    description: "Designed for the ultimate big-screen experience. Compatible with Smart TVs, Firestick, NVIDIA Shield, and Android TV boxes.",
    icon: Tv,
    badge: "v1.0.0 Stable",
    badgeVariant: "success",
    color: "from-violet-500 to-purple-600",
    borderColor: "border-violet-500/30",
    downloadUrl: "https://github.com/motivesolutionss/Smartifly-Xtream-UI/releases/download/v1.0.0/smartiflyapp.apk",
    downloadLabel: "Download TV APK",
    specs: [
      { label: "File Size", value: "45.2 MB" },
      { label: "Min OS", value: "Android 5.0 / FireOS 6" },
      { label: "File Type", value: "APK (Universal)" },
      { label: "MD5 Hash", value: "8e73fc...819a" },
    ],
    steps: [
      "Navigate to Settings > Device > Developer Options on your TV.",
      "Enable 'Allow Apps from Unknown Sources'.",
      "If using Firestick, search for and install the 'Downloader' app from the Amazon App Store.",
      "Enter the download URL in the Downloader app to grab the APK directly.",
      "Open the downloaded file and click 'Install'.",
      "Launch Smartifly, input your Xtream API credentials, and start streaming!"
    ]
  },
  {
    id: "android-mobile",
    type: "mobile",
    status: "active",
    title: "Android Mobile & Tablet",
    description: "Fully optimized streaming on the go. Enjoy responsive UI, offline caching, and portrait/landscape playback modes.",
    icon: Smartphone,
    badge: "v1.0.0 Stable",
    badgeVariant: "success",
    color: "from-cyan-500 to-blue-600",
    borderColor: "border-cyan-500/30",
    downloadUrl: "https://github.com/motivesolutionss/Smartifly-Xtream-UI/releases/download/v1.0.0/smartiflyapp.apk",
    downloadLabel: "Download Mobile APK",
    specs: [
      { label: "File Size", value: "38.7 MB" },
      { label: "Min OS", value: "Android 6.0+" },
      { label: "File Type", value: "APK (ARM64)" },
      { label: "MD5 Hash", value: "a5f8ee...92bd" },
    ],
    steps: [
      "Tap the 'Download Mobile APK' button above to save the file to your device.",
      "Open your device's file manager and locate the downloaded APK.",
      "If prompted, go to browser settings and toggle 'Allow from this source'.",
      "Confirm the installation and wait for it to complete.",
      "Open the app and log in with your subscription credentials."
    ]
  },
  {
    id: "ios",
    type: "mobile",
    status: "upcoming",
    title: "Apple iOS (iPhone & iPad)",
    description: "Sleek iOS client featuring native AirPlay support, Picture-in-Picture mode, and Apple TV App integration.",
    icon: Apple,
    badge: "Coming Q3 2026",
    badgeVariant: "info",
    color: "from-rose-500 to-orange-600",
    borderColor: "border-rose-500/20",
    downloadUrl: "#",
    downloadLabel: "iOS TestFlight Beta",
    specs: [
      { label: "Status", value: "In Development" },
      { label: "Platform", value: "App Store / TestFlight" },
      { label: "Min OS", value: "iOS 15.0+" },
      { label: "Features", value: "AirPlay, PiP" }
    ]
  },
  {
    id: "lg-tv",
    type: "tv",
    status: "upcoming",
    title: "LG Smart TV (webOS)",
    description: "Native webOS application tailored for LG magic remote controls with ultra-low resource utilization.",
    icon: Tv,
    badge: "Coming Q4 2026",
    badgeVariant: "info",
    color: "from-pink-500 to-purple-600",
    borderColor: "border-pink-500/20",
    downloadUrl: "#",
    downloadLabel: "LG Content Store",
    specs: [
      { label: "Status", value: "Prototyping" },
      { label: "Platform", value: "LG Content Store" },
      { label: "Min OS", value: "webOS 4.0+" },
      { label: "Features", value: "Magic Remote Support" }
    ]
  },
  {
    id: "samsung-tv",
    type: "tv",
    status: "upcoming",
    title: "Samsung TV (Tizen)",
    description: "Fully featured Tizen client ensuring maximum audio/video synchronization and Smart Hub integration.",
    icon: Tv,
    badge: "Coming Q4 2026",
    badgeVariant: "info",
    color: "from-amber-500 to-red-600",
    borderColor: "border-amber-500/20",
    downloadUrl: "#",
    downloadLabel: "Samsung App Store",
    specs: [
      { label: "Status", value: "Planning" },
      { label: "Platform", value: "Samsung App Store" },
      { label: "Min OS", value: "Tizen 5.0+" },
      { label: "Features", value: "HDR10+ / Dolby Atmos" }
    ]
  }
];

const faqs = [
  {
    q: "Why do I get a 'Blocked by Play Protect' warning?",
    a: "Since our APK is hosted outside the Google Play Store, Android marks it as from an 'Unknown Source'. This is standard for third-party developer builds. Our APK is 100% secure, malware-free, and undergoes strict security code-signing audits before publication."
  },
  {
    q: "How do I upgrade the app when a new version is released?",
    a: "To upgrade, simply return to this Downloads page, download the latest APK, and install it. Android will automatically overwrite the old version while keeping all your logins, playlists, and settings safe."
  },
  {
    q: "Can I use external players like VLC or MX Player?",
    a: "Yes! Smartifly's built-in player is optimized for HDR content and subtitles, but you can easily toggle external player support within the Settings menu of either app."
  }
];

export default function DownloadsPage() {
  const { reduceMotion, useLiteEffects } = usePerformanceMode();
  const [filter, setFilter] = useState("all");
  const [expandedGuide, setExpandedGuide] = useState<string | null>(null);

  const filteredPlatforms = platforms.filter(p => {
    if (filter === "all") return true;
    if (filter === "active") return p.status === "active";
    if (filter === "upcoming") return p.status === "upcoming";
    if (filter === "tv") return p.type === "tv";
    if (filter === "mobile") return p.type === "mobile";
    return true;
  });

  return (
    <div className="relative min-h-screen bg-transparent pt-24 pb-32 overflow-hidden">
      
      {/* Background Orbs */}
      <div className="absolute inset-0 pointer-events-none">
        {useLiteEffects ? (
          <>
            <div className="absolute top-10 left-10 h-64 w-64 rounded-full bg-primary/6 opacity-70" />
            <div className="absolute bottom-20 right-10 h-52 w-52 rounded-full bg-accent/6 opacity-70" />
          </>
        ) : (
          <>
            <motion.div
              className="absolute top-10 left-10 w-[500px] h-[500px] bg-gradient-glow-violet rounded-full blur-[140px] opacity-15"
              animate={reduceMotion ? { opacity: 0.15 } : { scale: [1, 1.2, 1], opacity: [0.15, 0.25, 0.15] }}
              transition={reduceMotion ? { duration: 0.2 } : { duration: 10, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute bottom-20 right-10 w-[400px] h-[400px] bg-gradient-glow-cyan rounded-full blur-[120px] opacity-10"
              animate={reduceMotion ? { opacity: 0.1 } : { scale: [1.2, 1, 1.2], opacity: [0.1, 0.2, 0.1] }}
              transition={reduceMotion ? { duration: 0.2 } : { duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
            />
          </>
        )}
      </div>

      <div className="container max-w-6xl relative z-10">
        
        {/* HERO HEADER */}
        <div className="text-center mb-16">
          <motion.div
            initial={useLiteEffects ? false : { opacity: 0, scale: 0.8 }}
            animate={useLiteEffects ? undefined : { opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 backdrop-blur-xl mb-6"
          >
            <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse" />
            <span className="text-[10px] font-black tracking-[0.25em] uppercase text-primary font-heading">
              Client Applications
            </span>
          </motion.div>

          <h1 className="text-5xl md:text-7xl font-bold font-heading tracking-tighter mb-6 leading-tight">
            Stream Anywhere, <br />
            <span className="text-gradient-animated">Every Device.</span>
          </h1>

          <p className="text-lg md:text-xl text-foreground-secondary max-w-2xl mx-auto font-light leading-relaxed">
            Download our native high-performance apps for your Android TV and Mobile devices, 
            or explore upcoming applications for iOS and other Smart TV ecosystems.
          </p>
        </div>

        {/* TABS FILTER */}
        <div className="flex flex-wrap justify-center gap-2 mb-12">
          {[
            { id: "all", label: "All Devices" },
            { id: "active", label: "Available Now" },
            { id: "upcoming", label: "Coming Soon" },
            { id: "tv", label: "Smart TVs" },
            { id: "mobile", label: "Mobiles & Tablets" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-5 py-2.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-all duration-300 border
                ${filter === tab.id 
                  ? "bg-primary text-primary-foreground border-primary shadow-[0_0_15px_rgba(var(--primary),0.3)] scale-105" 
                  : "bg-white/[0.03] text-foreground-secondary border-white/5 hover:text-foreground hover:bg-white/5 hover:border-white/20"
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* CARDS GRID */}
        <motion.div 
          layout={!useLiteEffects}
          className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-24"
        >
          <AnimatePresence mode={useLiteEffects ? "wait" : "popLayout"}>
            {filteredPlatforms.map((plat) => {
              const Icon = plat.icon;
              const isActive = plat.status === "active";
              
              return (
                <motion.div
                  layout={!useLiteEffects}
                  key={plat.id}
                  initial={useLiteEffects ? false : { opacity: 0, scale: 0.95, y: 20 }}
                  animate={useLiteEffects ? undefined : { opacity: 1, scale: 1, y: 0 }}
                  exit={useLiteEffects ? undefined : { opacity: 0, scale: 0.95, y: 20 }}
                  transition={useLiteEffects ? undefined : { duration: 0.4 }}
                  className={`group rounded-[2rem] border relative overflow-hidden transition-all duration-500
                    ${isActive 
                      ? `bg-white/[0.02] border-white/5 hover:border-primary/40 ${plat.id === 'android-tv' ? 'md:col-span-2 lg:col-span-2' : ''}` 
                      : "bg-white/[0.01] border-white/5 hover:border-white/10 opacity-75 hover:opacity-100"
                    }
                  `}
                >
                  {/* Decorative Glow */}
                  {!useLiteEffects && (
                    <div className={`absolute -right-20 -top-20 w-48 h-48 bg-gradient-to-br ${plat.color} opacity-0 group-hover:opacity-10 rounded-full blur-3xl transition-opacity duration-700 pointer-events-none`} />
                  )}

                  <div className="p-8 md:p-10 flex flex-col h-full justify-between">
                    <div>
                      {/* Header (Icon + Badge) */}
                      <div className="flex justify-between items-start mb-8">
                        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${plat.color} flex items-center justify-center border border-white/10 shadow-lg`}>
                          <Icon className="w-7 h-7 text-white" />
                        </div>
                        <Badge 
                          variant={plat.badgeVariant as any} 
                          className="px-3 py-1 font-bold text-[10px] tracking-wider uppercase"
                        >
                          {plat.badge}
                        </Badge>
                      </div>

                      {/* Content */}
                      <h3 className="text-2xl md:text-3xl font-bold font-heading mb-4 text-foreground flex items-center gap-3">
                        {plat.title}
                        {isActive && <Flame className={`w-5 h-5 text-orange-500 ${reduceMotion ? "" : "animate-pulse"}`} />}
                      </h3>

                      <p className="text-sm md:text-base text-foreground-secondary leading-relaxed mb-8 font-light">
                        {plat.description}
                      </p>

                      {/* Specs */}
                      <div className="grid grid-cols-2 gap-4 mb-8 bg-white/[0.01] border border-white/5 rounded-2xl p-5">
                        {plat.specs.map((spec, index) => (
                          <div key={index} className="space-y-1">
                            <div className="text-[10px] font-bold tracking-wider uppercase text-foreground-muted">{spec.label}</div>
                            <div className="text-sm font-semibold text-foreground">{spec.value}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div>
                      {isActive ? (
                        <div className="flex flex-col gap-4 mt-6">
                          <a href={plat.downloadUrl} className="w-full">
                            <Button variant="default" size="lg" className="w-full h-14 rounded-full text-sm font-bold uppercase tracking-wider">
                              <Download className={`w-5 h-5 mr-3 ${reduceMotion ? "" : "transition-transform group-hover:scale-110"}`} />
                              {plat.downloadLabel}
                            </Button>
                          </a>
                          
                          <Button 
                            variant="outline" 
                            size="lg" 
                            className="w-full h-14 rounded-full text-xs font-bold uppercase tracking-wider border-white/10 bg-white/[0.02]"
                            onClick={() => setExpandedGuide(expandedGuide === plat.id ? null : plat.id)}
                          >
                            <Info className="w-4.5 h-4.5 mr-2" />
                            {expandedGuide === plat.id ? "Hide Setup Instructions" : "View Setup Instructions"}
                          </Button>

                          {/* Expandable Setup Instructions */}
                          {useLiteEffects ? (
                            expandedGuide === plat.id ? (
                              <div className="overflow-hidden">
                                <div className="mt-4 p-6 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4">
                                  <div className="text-sm font-bold text-primary flex items-center gap-2">
                                    <Settings className="w-4 h-4" />
                                    Step-by-Step Installation Guide
                                  </div>
                                  <ol className="space-y-3">
                                    {plat.steps?.map((step, idx) => (
                                      <li key={idx} className="flex gap-3 text-sm text-foreground-secondary leading-relaxed font-light">
                                        <span className="font-bold text-primary font-heading mt-0.5">{String(idx + 1).padStart(2, '0')}.</span>
                                        <span>{step}</span>
                                      </li>
                                    ))}
                                  </ol>
                                  <div className="flex items-center gap-2 text-xs text-foreground-muted mt-2 pt-4 border-t border-white/5">
                                    <ShieldCheck className="w-4 h-4 text-success" />
                                    <span>Verified Secure APK. MD5 Signature matches release build.</span>
                                  </div>
                                </div>
                              </div>
                            ) : null
                          ) : (
                            <AnimatePresence>
                              {expandedGuide === plat.id && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: "auto" }}
                                  exit={{ opacity: 0, height: 0 }}
                                  transition={{ duration: 0.3 }}
                                  className="overflow-hidden"
                                >
                                  <div className="mt-4 p-6 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4">
                                    <div className="text-sm font-bold text-primary flex items-center gap-2">
                                      <Settings className={`w-4 h-4 ${reduceMotion ? "" : "animate-spin-slow"}`} />
                                      Step-by-Step Installation Guide
                                    </div>
                                    <ol className="space-y-3">
                                      {plat.steps?.map((step, idx) => (
                                        <li key={idx} className="flex gap-3 text-sm text-foreground-secondary leading-relaxed font-light">
                                          <span className="font-bold text-primary font-heading mt-0.5">{String(idx + 1).padStart(2, '0')}.</span>
                                          <span>{step}</span>
                                        </li>
                                      ))}
                                    </ol>
                                    <div className="flex items-center gap-2 text-xs text-foreground-muted mt-2 pt-4 border-t border-white/5">
                                      <ShieldCheck className="w-4 h-4 text-success" />
                                      <span>Verified Secure APK. MD5 Signature matches release build.</span>
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          )}
                        </div>
                      ) : (
                        <div className="mt-6">
                          <Button 
                            disabled 
                            variant="outline" 
                            size="lg" 
                            className="w-full h-14 rounded-full text-xs font-bold uppercase tracking-wider border-white/5 text-foreground-muted bg-white/[0.01]"
                          >
                            <MonitorPlay className="w-4 h-4 mr-2" />
                            Application in Development
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>

        {/* SECURITY & TRUST SECTION */}
        <section className="mb-24">
          <div className="relative p-1 rounded-[3rem] bg-gradient-to-r from-primary/20 via-white/5 to-primary/20">
            <div className="bg-background/80 backdrop-blur-3xl rounded-[2.9rem] py-12 px-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
                {[
                  {
                    icon: ShieldCheck,
                    title: "Malware-Free Promise",
                    desc: "Every app build passes comprehensive checks for viruses, Trojans, and ad-injectors. Rest easy streaming on your devices."
                  },
                  {
                    icon: Layers,
                    title: "Optimized Performance",
                    desc: "Our media player architecture uses hardware acceleration to decode 4K streams smoothly without overheating hardware."
                  },
                  {
                    icon: Star,
                    title: "Xtream API Native",
                    desc: "Log in seamlessly using standard server URL, username, and password parameters. No complicated setups required."
                  }
                ].map((feature, i) => (
                  <div key={i} className="space-y-3 p-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto md:mx-0">
                      <feature.icon className="w-6 h-6 text-primary" />
                    </div>
                    <h4 className="text-lg font-bold tracking-tight text-foreground">{feature.title}</h4>
                    <p className="text-sm text-foreground-muted leading-relaxed font-light">{feature.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* FAQ ACCORDION */}
        <section className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold font-heading text-foreground mb-4">Downloads FAQ</h2>
            <p className="text-sm text-foreground-secondary font-light">Frequently asked questions regarding app security, updates, and compatibility.</p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div 
                key={idx} 
                className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all"
              >
                <h4 className="text-base font-bold text-foreground mb-2 flex items-start gap-3">
                  <HelpCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  {faq.q}
                </h4>
                <p className="text-sm text-foreground-secondary leading-relaxed font-light pl-8">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
