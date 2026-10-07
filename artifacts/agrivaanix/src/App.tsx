import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { ClerkProvider, Show, SignIn, SignUp, useClerk, useUser } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import {
  Activity, ArrowLeft, ArrowRight, AudioLines, BookOpen, Check, ChevronDown,
  CircleHelp, Clock3, CloudSun, Ear, History, Leaf, LogOut, MapPin, Menu, Mic,
  MicOff, MessageCircle, Plus, Send, Settings, ShieldAlert, Sprout, Tractor, Trash2, Volume2,
  VolumeX, Wheat, X,
} from 'lucide-react';
import {
  getGetConversationMessagesQueryKey, getGetDashboardSummaryQueryKey, getGetFarmProfileQueryKey,
  getGetPreferencesQueryKey, getListConversationsQueryKey, useCreateAdvisory, useCreateConversation,
  useDeleteConversation, useGetConversationMessages, useGetDashboardSummary, useGetFarmProfile,
  useGetPreferences, useHealthCheck, useListConversations, useSyncProfile, useUpdateFarmProfile,
  useUpdatePreferences,
} from '@workspace/api-client-react';
import type { AdvisoryDomain, Conversation, FarmProfileInput, PreferencesInput } from '@workspace/api-client-react';
import { Link, Redirect, Route, Switch, Router as WouterRouter, useLocation, useRoute } from 'wouter';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient();
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const clerkPubKey = publishableKeyFromHost(window.location.hostname, import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const languageChoices = [
  { label: 'English', code: 'en-US', short: 'EN' },
  { label: 'हिन्दी', code: 'hi-IN', short: 'हि' },
  { label: 'తెలుగు', code: 'te-IN', short: 'తె' },
];
const languagePreferenceChoices = [
  { label: 'Automatic', code: 'auto', short: 'AUTO' },
  ...languageChoices,
];
const domainLabels: Record<AdvisoryDomain, string> = {
  CROP_SELECTION: 'Crop selection', PEST_DISEASE_DIAGNOSIS: 'Pest & disease', WEATHER_IRRIGATION: 'Weather & irrigation',
  SOIL_FERTILIZER: 'Soil & fertilizer', MARKET_PRICES: 'Market prices', GOVT_SCHEMES: 'Government schemes',
  GENERAL_AGRI: 'General farming', LANGUAGE_SWITCH: 'Language', UNSUPPORTED: 'Other question',
};

function stripBase(path: string) {
  return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || '/' : path;
}

const appearance = {
  theme: shadcn,
  cssLayerName: 'clerk',
  options: {
    logoPlacement: 'inside' as const,
    logoLinkUrl: basePath || '/',
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: '#28553c', colorForeground: '#23392d', colorMutedForeground: '#68786d',
    colorDanger: '#b3483f', colorBackground: '#fffdf6', colorInput: '#fbfaf3',
    colorInputForeground: '#23392d', colorNeutral: '#d9dfd5', fontFamily: 'DM Sans',
    borderRadius: '0.8rem',
  },
  elements: {
    rootBox: 'w-full flex justify-center',
    cardBox: 'bg-[#fffdf6] rounded-2xl w-[440px] max-w-full overflow-hidden border border-[#d9dfd5]',
    card: '!shadow-none !border-0 !bg-transparent !rounded-none',
    footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
    headerTitle: 'text-[#23392d] font-bold', headerSubtitle: 'text-[#68786d]',
    socialButtonsBlockButtonText: 'text-[#23392d] font-semibold', formFieldLabel: 'text-[#334d3b] font-semibold',
    footerActionLink: 'text-[#28553c] font-semibold', footerActionText: 'text-[#68786d]',
    dividerText: 'text-[#68786d]', identityPreviewEditButton: 'text-[#28553c]',
    formFieldSuccessText: 'text-[#28553c]', alertText: 'text-[#9d3e36]',
    logoBox: 'rounded-xl', logoImage: 'rounded-xl', socialButtonsBlockButton: 'border-[#d9dfd5] rounded-xl',
    formButtonPrimary: 'bg-[#28553c] hover:bg-[#1c422d] text-[#fffdf6] rounded-xl',
    formFieldInput: 'bg-[#fbfaf3] border-[#d9dfd5] text-[#23392d] rounded-xl',
    footerAction: 'text-[#68786d]', dividerLine: 'bg-[#e3e6df]', alert: 'rounded-xl',
    otpCodeFieldInput: 'border-[#d9dfd5] text-[#23392d]', formFieldRow: 'text-[#334d3b]', main: 'text-[#23392d]',
  },
};

function Brand({ inverse = false }: { inverse?: boolean }) {
  return <Link href="/" className={`brand flex items-center gap-3 ${inverse ? 'text-sidebar-foreground' : 'text-foreground'}`} data-testid="link-brand">
    <span className="grid size-10 place-items-center rounded-[13px] bg-primary text-primary-foreground shadow-sm"><Sprout size={23} strokeWidth={2.3} /></span>
    <span className="leading-tight"><strong className="font-display block text-[18px] tracking-[-.04em]">AgriVaanix</strong><small className={`block text-[10px] font-semibold uppercase tracking-[.2em] ${inverse ? 'text-sidebar-foreground/60' : 'text-muted-foreground'}`}>Advice that takes root</small></span>
  </Link>;
}

function Button({ children, variant = 'primary', className = '', ...props }: {
  children: ReactNode; variant?: 'primary' | 'outline' | 'quiet' | 'danger'; className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const styles = {
    primary: 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm',
    outline: 'border border-border bg-card text-foreground hover:bg-muted',
    quiet: 'text-muted-foreground hover:bg-muted hover:text-foreground',
    danger: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
  };
  return <button {...props} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition duration-200 active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-55 ${styles[variant]} ${className}`} />;
}

function StatusMessage({ children, tone = 'error' }: { children: ReactNode; tone?: 'error' | 'success' | 'info' }) {
  const colors = { error: 'border-red-200 bg-red-50 text-red-900', success: 'border-emerald-200 bg-emerald-50 text-emerald-900', info: 'border-secondary bg-secondary/40 text-foreground' };
  return <div role={tone === 'error' ? 'alert' : 'status'} className={`rounded-xl border px-4 py-3 text-sm ${colors[tone]}`} data-testid="status-message">{children}</div>;
}

function Skeleton({ lines = 3 }: { lines?: number }) {
  return <div className="animate-pulse space-y-3" aria-label="Loading content">{Array.from({ length: lines }).map((_, i) => <div key={i} className={`h-12 rounded-xl bg-muted ${i === lines - 1 ? 'w-2/3' : 'w-full'}`} />)}</div>;
}

function AuthRedirect({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useUser();
  if (!isLoaded) return <div className="grid min-h-[100dvh] place-items-center px-6"><div className="w-full max-w-sm"><Brand /><div className="mt-9"><Skeleton lines={4} /></div></div></div>;
  if (!isSignedIn) return <Redirect to="/sign-in" />;
  return <>{children}</>;
}

function LandingPage() {
  const { isSignedIn } = useUser();
  const [, setLocation] = useLocation();
  const [question, setQuestion] = useState('');
  if (isSignedIn) return <Redirect to="/dashboard" />;
  const sample = (text: string) => { setQuestion(text); document.getElementById('ask-us')?.focus(); };
  const begin = (e: FormEvent) => {
    e.preventDefault();
    if (question.trim()) sessionStorage.setItem('agri:pending-query', question.trim());
    setLocation(`/sign-in`);
  };
  return <div className="grain min-h-[100dvh] overflow-hidden bg-background text-foreground">
    <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
      <Brand />
      <nav className="flex items-center gap-2">
        <Link href="/help" className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground hover:text-primary sm:block">How it works</Link>
        <Link href="/sign-in" className="rounded-xl px-4 py-2.5 text-sm font-bold text-primary hover:bg-secondary/50" data-testid="link-sign-in">Sign in</Link>
        <Link href="/sign-up" className="hidden rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-sm transition hover:bg-primary/90 sm:inline-flex" data-testid="link-sign-up">Join for free</Link>
      </nav>
    </header>
    <main>
      <section className="relative mx-auto grid max-w-7xl items-center gap-10 px-5 pb-16 pt-10 sm:px-8 md:grid-cols-[1.05fr_.95fr] md:pb-24 md:pt-16">
        <div className="page-enter relative z-[1]">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-2 text-xs font-bold text-primary"><span className="size-2 rounded-full bg-accent" /> A trusted voice in your pocket</div>
          <h1 className="font-display max-w-[720px] text-[clamp(3rem,7.3vw,6.3rem)] font-extrabold leading-[.97] tracking-[-.075em]">Good farming starts with a <span className="relative inline-block text-primary">good answer.<svg className="absolute -bottom-3 left-0 w-full" viewBox="0 0 340 14" fill="none" aria-hidden="true"><path d="M4 9C81 3 253 3 336 8" stroke="#D49B39" strokeWidth="7" strokeLinecap="round"/></svg></span></h1>
          <p className="mt-8 max-w-xl text-lg leading-8 text-muted-foreground sm:text-xl">Ask what is happening in your field. Get clear next steps in the language you speak, shaped around the farm you grow.</p>
          <div className="mt-8 flex flex-wrap items-center gap-3"><Link href="/sign-up" className="inline-flex min-h-12 items-center gap-3 rounded-xl bg-primary px-5 font-bold text-primary-foreground shadow-sm transition hover:-translate-y-0.5 hover:bg-primary/90">Start asking <ArrowRight size={18} /></Link><Link href="/help" className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-border bg-card px-5 font-bold text-foreground hover:bg-muted"><CircleHelp size={17} /> See how it works</Link></div>
          <div className="mt-8 flex items-center gap-3 text-sm text-muted-foreground"><div className="flex -space-x-2">{['రా','क','M'].map((x, i) => <span key={x} className={`grid size-8 place-items-center rounded-full border-2 border-background text-xs font-bold ${['bg-[#e9bd69]','bg-[#bfd2b3]','bg-[#d9c8b2]'][i]}`}>{x}</span>)}</div><span>Made for the people who grow our food</span></div>
        </div>
        <div className="relative mx-auto w-full max-w-[570px] page-enter [animation-delay:120ms]">
          <div className="absolute -right-5 -top-8 h-40 w-40 rounded-full bg-accent/15 blur-3xl" />
          <div className="relative aspect-[1.06] overflow-hidden rounded-[2.2rem] border border-[#dce1d1] bg-[#e9eddf] p-4 shadow-[0_35px_75px_-45px_rgba(39,75,49,.42)] sm:p-7">
            <div className="absolute inset-0 opacity-70" aria-hidden="true" style={{ backgroundImage: 'radial-gradient(ellipse at 75% 22%, #f9ecc5 0, transparent 25%), linear-gradient(145deg,#e9eddf 8%,#dbe5d0 65%,#c5d3b7 100%)' }} />
            <div className="relative flex h-full flex-col justify-between">
              <div className="flex items-start justify-between"><span className="rounded-full bg-[#f8f3e4]/90 px-3 py-2 text-[11px] font-bold uppercase tracking-[.14em] text-primary">Field note · No. 08</span><span className="grid size-11 place-items-center rounded-full bg-card/90 text-primary"><Wheat size={21} /></span></div>
              <div className="relative mx-auto flex w-full max-w-[395px] flex-col gap-3 rounded-[1.45rem] border border-white/60 bg-[#fffdf6]/95 p-5 shadow-xl sm:p-6">
                <p className="text-xs font-bold uppercase tracking-[.12em] text-muted-foreground">Your question</p><p className="font-display text-xl font-bold leading-snug text-foreground">“My cotton leaves have small yellow spots. What should I check first?”</p>
                <div className="my-1 h-px bg-border" />
                <div className="flex items-start gap-3"><span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-secondary text-primary"><Sprout size={19} /></span><div><p className="text-xs font-bold uppercase tracking-[.12em] text-primary">A useful first step</p><p className="mt-1 text-sm leading-6 text-foreground">Check the underside of a few leaves for tiny insects before choosing a treatment.</p></div></div>
                <div className="flex items-center justify-between pt-2"><span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"><AudioLines size={14} /> Listen in your language</span><span className="grid size-9 place-items-center rounded-full bg-primary text-primary-foreground"><Volume2 size={16} /></span></div>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-white/70 bg-[#fffdf6]/75 px-4 py-3 text-sm font-semibold text-primary"><span className="inline-flex items-center gap-2"><MapPin size={16} /> Advice shaped to your farm</span><ArrowRight size={16} /></div>
            </div>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-5 pb-20 sm:px-8">
        <div className="rounded-[1.6rem] border border-border bg-card p-5 soft-shadow sm:p-7">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2"><div><p className="text-xs font-extrabold uppercase tracking-[.16em] text-accent">Try a question</p><h2 className="font-display mt-1 text-2xl font-bold tracking-tight">What’s on your mind today?</h2></div><span className="text-sm text-muted-foreground">Speak or type — both work</span></div>
          <form onSubmit={begin} className="rounded-2xl border border-border bg-background p-3 sm:p-4">
            <textarea id="ask-us" rows={2} value={question} onChange={e => setQuestion(e.target.value)} placeholder="For example: Is this a good week to irrigate my groundnut crop?" className="w-full resize-none bg-transparent p-2 text-base leading-7 outline-none placeholder:text-muted-foreground/75" data-testid="input-home-question" />
            <div className="flex items-center justify-between gap-3 border-t border-border pt-3"><div className="flex gap-2">{languageChoices.map(item => <button key={item.code} type="button" onClick={() => sample(item.label === 'English' ? 'How can I improve my soil before planting?' : item.label === 'हिन्दी' ? 'मेरी फसल के पत्तों पर धब्बे हैं, क्या करूँ?' : 'నా పంటకు ఇప్పుడు నీరు పెట్టాలా?')} className="rounded-lg px-2 py-1 text-xs font-bold text-muted-foreground hover:bg-secondary hover:text-primary" data-testid={`button-language-${item.short}`}>{item.short}</button>)}</div><Button type="submit"><Mic size={16} /> Ask AgriVaanix</Button></div>
          </form>
          <div className="mt-4 flex flex-wrap gap-2">{['What can I plant this season?', 'Help me identify a pest', 'How much water does my crop need?'].map(prompt => <button key={prompt} type="button" onClick={() => sample(prompt)} className="rounded-full border border-border px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:border-primary/40 hover:bg-secondary/40 hover:text-primary">{prompt}</button>)}</div>
        </div>
      </section>
      <section className="bg-[#e9eddf]">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 md:grid-cols-[.8fr_1.2fr] md:py-20">
          <div><p className="text-xs font-extrabold uppercase tracking-[.18em] text-primary">A little more confidence, every day</p><h2 className="font-display mt-4 text-4xl font-extrabold tracking-[-.05em] sm:text-5xl">Useful advice.<br/>Without the jargon.</h2><p className="mt-5 max-w-md leading-7 text-muted-foreground">Your field has its own conditions. The more we know about your soil, crops and water, the more relevant each answer can be.</p><Link href="/sign-up" className="mt-7 inline-flex items-center gap-2 font-bold text-primary hover:gap-3">Set up your farm <ArrowRight size={17} /></Link></div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[{ icon: Ear, title: 'Talk it through', text: 'Use your voice when typing is a bother. Listen back when it suits you.' }, { icon: MapPin, title: 'Grounded in your farm', text: 'Save your location, soil and crops once for more useful context.' }, { icon: BookOpen, title: 'Keep a field notebook', text: 'Past conversations stay easy to find when a question comes around again.' }, { icon: ShieldAlert, title: 'Careful by design', text: 'Practical guidance, with clear cautions when a decision needs local expertise.' }].map(({ icon: Icon, title, text }) => <article key={title} className="rounded-2xl border border-[#d7dfd0] bg-card/80 p-5"><span className="grid size-10 place-items-center rounded-xl bg-secondary text-primary"><Icon size={19} /></span><h3 className="mt-4 font-display text-lg font-bold">{title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p></article>)}
          </div>
        </div>
      </section>
      <section className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-7 px-5 py-16 sm:px-8 md:flex-row md:items-center md:py-20">
        <div><p className="text-xs font-extrabold uppercase tracking-[.18em] text-accent">Start with one question</p><h2 className="font-display mt-3 max-w-2xl text-4xl font-extrabold tracking-[-.05em] sm:text-5xl">Your next good decision is one conversation away.</h2></div><Link href="/sign-up" className="inline-flex min-h-12 shrink-0 items-center gap-3 rounded-xl bg-primary px-5 font-bold text-primary-foreground">Create your free account <ArrowRight size={18} /></Link>
      </section>
    </main>
    <footer className="border-t border-border bg-card"><div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-6 sm:px-8 md:flex-row md:items-center md:justify-between"><Brand /><div className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-muted-foreground"><Link href="/help" className="hover:text-primary">Help & guidance</Link><Link href="/sign-in" className="hover:text-primary">Sign in</Link><span>Built for the hands that feed us.</span></div></div></footer>
  </div>;
}

function SignInPage() {
  return <div className="grain flex min-h-[100dvh] flex-col items-center justify-center gap-7 bg-background px-5 py-8"><Brand /><SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} /></div>;
}
function SignUpPage() {
  return <div className="grain flex min-h-[100dvh] flex-col items-center justify-center gap-7 bg-background px-5 py-8"><Brand /><SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} /></div>;
}

function AppShell({ children }: { children: ReactNode }) {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const sync = useSyncProfile();
  const synced = useRef('');
  const [mobileNav, setMobileNav] = useState(false);
  const [loc] = useLocation();
  useEffect(() => {
    if (isLoaded && user?.id && synced.current !== user.id) {
      synced.current = user.id;
      sync.mutate();
    }
  }, [isLoaded, user?.id]);
  const nav = [
    { href: '/dashboard', title: 'Ask for advice', icon: MessageCircle },
    { href: '/history', title: 'Past consultations', icon: History },
    { href: '/farm-profile', title: 'My farm', icon: Tractor },
    { href: '/settings', title: 'Preferences', icon: Settings },
    { href: '/help', title: 'Help & guidance', icon: CircleHelp },
  ];
  return <div className="min-h-[100dvh] bg-background text-foreground md:flex">
    {mobileNav && <button aria-label="Close navigation" onClick={() => setMobileNav(false)} className="fixed inset-0 z-30 bg-foreground/35 md:hidden" />}
    <aside className={`fixed inset-y-0 left-0 z-40 flex w-[276px] flex-col bg-sidebar px-4 pb-4 pt-5 text-sidebar-foreground transition-transform duration-300 md:sticky md:top-0 md:h-[100dvh] md:translate-x-0 ${mobileNav ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="flex items-center justify-between px-2"><Brand inverse /><button className="grid size-9 place-items-center rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent md:hidden" onClick={() => setMobileNav(false)} aria-label="Close menu"><X size={19} /></button></div>
      <Link href="/dashboard" className="mt-9 inline-flex min-h-11 w-full items-center justify-start gap-2 rounded-xl bg-sidebar-primary px-4 py-2.5 text-sm font-bold text-sidebar-primary-foreground shadow-sm transition hover:bg-sidebar-primary/90"><Plus size={17} /> New question</Link>
      <p className="mb-2 mt-9 px-3 text-[10px] font-bold uppercase tracking-[.19em] text-sidebar-foreground/45">Your workspace</p>
      <nav className="space-y-1">{nav.map(({ href, title, icon: Icon }) => <Link key={href} href={href} onClick={() => setMobileNav(false)} className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition ${loc === href || (href === '/dashboard' && loc.startsWith('/chat/')) ? 'nav-active' : 'text-sidebar-foreground/75 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground'}`} data-testid={`link-nav-${href.slice(1)}`}><Icon size={18} strokeWidth={1.9} />{title}</Link>)}</nav>
      <div className="mt-auto rounded-2xl border border-sidebar-border bg-sidebar-accent/55 p-4"><div className="flex items-center gap-2 text-xs font-bold text-sidebar-primary"><span className="size-2 rounded-full bg-sidebar-primary" /> Your farm, your context</div><p className="mt-2 text-xs leading-5 text-sidebar-foreground/65">Add a farm profile to make each answer more relevant to your fields.</p><Link href="/farm-profile" className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-sidebar-primary hover:gap-2">Set up profile <ArrowRight size={13} /></Link></div>
      <div className="mt-4 flex items-center gap-3 rounded-xl px-2 py-2"><span className="grid size-9 shrink-0 place-items-center rounded-full bg-sidebar-primary text-sm font-extrabold text-sidebar-primary-foreground">{user?.firstName?.slice(0, 1) || 'F'}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{user?.firstName || 'Farmer'}</p><p className="truncate text-[11px] text-sidebar-foreground/55">{user?.primaryEmailAddress?.emailAddress || 'Your account'}</p></div><button onClick={() => signOut({ redirectUrl: basePath || '/' })} aria-label="Sign out" className="grid size-9 place-items-center rounded-lg text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground" data-testid="button-sign-out"><LogOut size={17} /></button></div>
    </aside>
    <div className="min-w-0 flex-1">
      <header className="sticky top-0 z-20 flex h-[68px] items-center justify-between border-b border-border/80 bg-background/90 px-4 backdrop-blur-xl sm:px-7">
        <div className="flex items-center gap-3"><button onClick={() => setMobileNav(true)} aria-label="Open menu" className="grid size-10 place-items-center rounded-xl border border-border bg-card md:hidden" data-testid="button-open-menu"><Menu size={19} /></button><span className="hidden text-sm font-semibold text-muted-foreground sm:block">A steadier hand for everyday decisions.</span><span className="text-sm font-bold text-primary sm:hidden">AgriVaanix</span></div>
        <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground"><span className="size-2 rounded-full bg-[#6b9d58]" /> Your advice workspace</div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-7 sm:px-7 sm:py-9">{children}</main>
    </div>
  </div>;
}

function PageTitle({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children?: ReactNode }) {
  return <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-[11px] font-extrabold uppercase tracking-[.18em] text-accent">{eyebrow}</p><h1 className="font-display mt-2 text-3xl font-extrabold tracking-[-.05em] sm:text-[2.65rem]">{title}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">{description}</p></div>{children}</div>;
}

function getErrorText(error: unknown) {
  if (error instanceof TypeError) return 'We couldn’t reach the advisory service. Check your connection and try again.';
  if (error && typeof error === 'object') {
    const details = error as { data?: { error?: string; message?: string }; status?: number };
    if (details.status === 429) return 'The advice service is busy. Please wait a little and try again.';
    if (details.data?.error || details.data?.message) return details.data.error || details.data.message || '';
  }
  return 'Something went wrong. Please try again.';
}

function QuestionComposer({ onSend, busy, value, setValue, onVoice }: {
  onSend: (value: string) => void; busy: boolean; value: string; setValue: (s: string) => void; onVoice?: () => void;
}) {
  const submit = (e: FormEvent) => { e.preventDefault(); onSend(value.trim()); };
  return <form onSubmit={submit} className="rounded-2xl border border-border bg-card p-3 soft-shadow sm:p-4">
    <textarea value={value} onChange={e => setValue(e.target.value)} rows={2} maxLength={4000} placeholder="Tell me what you’ve noticed in your field…" className="w-full resize-none bg-transparent p-2 text-base leading-7 outline-none placeholder:text-muted-foreground/70" data-testid="input-question" />
    <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
      <div className="flex items-center gap-2">{onVoice && <Button type="button" variant="outline" className="size-11 min-h-11 px-0" onClick={onVoice} aria-label="Speak your question" data-testid="button-voice"><Mic size={18} /></Button>}<span className="hidden text-xs text-muted-foreground sm:inline">You can type or speak · {value.length}/4000</span></div>
      <Button type="submit" disabled={busy || !value.trim()} data-testid="button-send-question">{busy ? <><Activity size={16} className="animate-pulse" /> Thinking…</> : <>Ask for advice <Send size={16} /></>}</Button>
    </div>
  </form>;
}

function DashboardPage() {
  const [, setLocation] = useLocation();
  const [draft, setDraft] = useState('');
  const [language, setLanguage] = useState('en-US');
  const summary = useGetDashboardSummary();
  const conversations = useListConversations();
  const health = useHealthCheck();
  const create = useCreateConversation();
  const preferences = useGetPreferences();
  useEffect(() => {
    if (preferences.data?.preferredLanguage) setLanguage(preferences.data.preferredLanguage);
  }, [preferences.data?.preferredLanguage]);
  const begin = (text = '') => create.mutate({ data: { title: text.slice(0, 90) || undefined, activeLanguage: language } }, {
    onSuccess: conversation => {
      setLocation(`/chat/${conversation.id}${text ? `?question=${encodeURIComponent(text)}` : ''}`);
    },
  });
  useEffect(() => {
    if (!preferences.isSuccess) return;
    const pending = sessionStorage.getItem('agri:pending-query');
    if (!pending) return;
    sessionStorage.removeItem('agri:pending-query');
    begin(pending);
  }, [preferences.isSuccess]);
  const profile = useGetFarmProfile();
  return <div className="page-enter">
    <PageTitle eyebrow="Your field desk" title="What would you like to know?" description="Ask in the language that feels natural. We’ll start with practical steps for your farm." />
    {(create.isError || summary.isError) && <div className="mb-5"><StatusMessage>{create.isError ? getErrorText(create.error) : `Your activity could not load. ${getErrorText(summary.error)}`}</StatusMessage></div>}
    <div className="grid gap-5 xl:grid-cols-[1fr_275px]">
      <section>
        <div className="relative overflow-hidden rounded-[1.6rem] bg-primary px-5 py-6 text-primary-foreground sm:px-8 sm:py-8">
          <div className="absolute -right-12 -top-16 size-64 rounded-full border-[35px] border-white/5" /><div className="absolute -bottom-28 right-28 size-56 rounded-full border-[25px] border-sidebar-primary/10" />
          <div className="relative"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-primary-foreground/65">Let’s work it out</p><h2 className="font-display mt-2 text-2xl font-extrabold tracking-[-.035em] sm:text-3xl">A question from your field?</h2></div><span className="hidden rounded-2xl border border-white/15 bg-white/10 p-3 sm:grid"><AudioLines size={22} /></span></div>
            <div className="mt-6"><QuestionComposer value={draft} setValue={setDraft} busy={create.isPending} onSend={value => value && begin(value)} /></div>
            <div className="mt-3"><VoiceControl languageCode={language} onTranscript={setDraft} /></div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-2">{languageChoices.map(l => <button type="button" key={l.code} onClick={() => setLanguage(l.code)} className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition ${language === l.code ? 'border-sidebar-primary bg-sidebar-primary text-sidebar-primary-foreground' : 'border-white/20 bg-white/10 text-primary-foreground/80 hover:bg-white/15'}`} aria-pressed={language === l.code} data-testid={`button-select-${l.short}`}>{l.label}</button>)}</div>
              <p className="flex items-center gap-1.5 text-xs text-primary-foreground/60"><ShieldAlert size={13} /> Advice is a starting point; check urgent issues locally.</p>
            </div>
          </div>
        </div>
        <div className="mt-7">
          <div className="mb-3 flex items-end justify-between"><div><p className="text-[10px] font-extrabold uppercase tracking-[.17em] text-muted-foreground">A good place to start</p><h2 className="font-display mt-1 text-xl font-bold">Common field questions</h2></div></div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[{ icon: Wheat, text: 'What can I plant this season?', color: 'bg-[#f1e7cb] text-[#816425]' }, { icon: Leaf, text: 'Help me identify a pest or disease', color: 'bg-[#dfebd8] text-primary' }, { icon: CloudSun, text: 'Should I irrigate today?', color: 'bg-[#dce8e7] text-[#3f7373]' }, { icon: Activity, text: 'How can I improve my soil?', color: 'bg-[#efdfd2] text-[#8c5c38]' }].map(({ icon: Icon, text, color }) => <button key={text} disabled={create.isPending} onClick={() => begin(text)} className="group flex min-h-[74px] items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md disabled:opacity-60" data-testid={`button-prompt-${text.slice(0, 8).replaceAll(' ', '-')}`}><span className={`grid size-10 shrink-0 place-items-center rounded-xl ${color}`}><Icon size={19} /></span><span className="flex-1 text-sm font-bold">{text}</span><ArrowRight size={16} className="text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" /></button>)}</div>
        </div>
        <div className="mt-8">
          <div className="mb-3 flex items-center justify-between"><div><p className="text-[10px] font-extrabold uppercase tracking-[.17em] text-muted-foreground">Your field notebook</p><h2 className="font-display mt-1 text-xl font-bold">Recent consultations</h2></div><Link href="/history" className="inline-flex items-center gap-1 text-sm font-bold text-primary hover:gap-2">View all <ArrowRight size={15} /></Link></div>
          {conversations.isLoading || summary.isLoading ? <Skeleton lines={2} /> : conversations.isError ? <StatusMessage>Couldn’t load consultations. <button onClick={() => conversations.refetch()} className="ml-1 font-bold underline">Try again</button></StatusMessage> : conversations.data?.length ? <div className="overflow-hidden rounded-2xl border border-border bg-card">{conversations.data.slice(0, 4).map((item, i) => <Link href={`/chat/${item.id}`} key={item.id} className={`flex items-center gap-3 p-4 transition hover:bg-muted/60 ${i ? 'border-t border-border' : ''}`} data-testid={`link-conversation-${item.id}`}><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary"><MessageCircle size={18} /></span><span className="min-w-0 flex-1"><strong className="block truncate text-sm">{item.title || 'Field consultation'}</strong><small className="mt-1 block truncate text-xs text-muted-foreground">{item.lastMessage || `${item.messageCount} messages`}</small></span><span className="hidden text-xs text-muted-foreground sm:block">{new Date(item.updatedAt).toLocaleDateString()}</span><ArrowRight size={15} className="text-muted-foreground" /></Link>)}</div> : <EmptyNotebook onStart={() => document.getElementById('input-question')?.focus()} /> }
        </div>
      </section>
      <aside className="space-y-4">
        <div className="rounded-2xl border border-border bg-card p-5"><div className="flex items-center justify-between"><h3 className="font-display text-lg font-bold">Your season, so far</h3><span className="grid size-9 place-items-center rounded-xl bg-secondary text-primary"><Activity size={18} /></span></div>{summary.isLoading ? <div className="mt-5"><Skeleton lines={2} /></div> : summary.isError ? <div className="mt-4"><StatusMessage>{getErrorText(summary.error)} <button onClick={() => summary.refetch()} className="font-bold underline">Retry</button></StatusMessage></div> : <div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-xl bg-background p-3"><strong className="font-display block text-2xl">{summary.data?.conversationCount ?? 0}</strong><span className="text-xs text-muted-foreground">conversations</span></div><div className="rounded-xl bg-background p-3"><strong className="font-display block text-2xl">{summary.data?.adviceCount ?? 0}</strong><span className="text-xs text-muted-foreground">answers shared</span></div></div>}<div className="mt-4 flex items-center gap-2 border-t border-border pt-4 text-xs text-muted-foreground"><span className={`size-2 rounded-full ${health.isError ? 'bg-destructive' : 'bg-[#6b9d58]'}`} />{health.isLoading ? 'Checking service…' : health.isError ? 'Service connection unavailable' : 'Advisory service ready'}</div></div>
        <div className="rounded-2xl border border-border bg-[#e9eddf] p-5"><div className="flex items-center gap-2"><Tractor size={17} className="text-primary" /><h3 className="font-display font-bold">Farm details</h3></div>{profile.isLoading ? <div className="mt-4"><Skeleton lines={2} /></div> : profile.isError ? <p className="mt-3 text-sm text-muted-foreground">Farm details are not available right now.</p> : <><p className="mt-3 text-sm leading-6 text-muted-foreground">{profile.data?.farmLocation ? `${profile.data.farmLocation} · ${profile.data.landSizeAcres} acres` : 'Add your farm details to make advice more specific.'}</p><Link href="/farm-profile" className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-primary">View farm profile <ArrowRight size={15} /></Link></>}</div>
        <div className="rounded-2xl border border-border bg-card p-5"><div className="flex items-center gap-2"><Clock3 size={17} className="text-accent" /><h3 className="font-display font-bold">Local knowledge matters</h3></div><p className="mt-3 text-sm leading-6 text-muted-foreground">For severe crop damage or chemical use, bring a sample to your local agriculture officer.</p><Link href="/help" className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-primary">Read safe-use guidance <ArrowRight size={15} /></Link></div>
      </aside>
    </div>
  </div>;
}

function EmptyNotebook({ onStart }: { onStart: () => void }) {
  return <div className="rounded-2xl border border-dashed border-border bg-card/60 px-5 py-8 text-center"><span className="mx-auto grid size-12 place-items-center rounded-2xl bg-secondary text-primary"><BookOpen size={21} /></span><h3 className="font-display mt-3 font-bold">Your notebook starts here</h3><p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-muted-foreground">When you ask your first question, we’ll keep the answer here for next time.</p><Button variant="outline" className="mt-4" onClick={onStart}>Ask your first question <ArrowRight size={15} /></Button></div>;
}

function VoiceControl({ languageCode, onTranscript }: { languageCode: string; onTranscript: (text: string) => void }) {
  const [listening, setListening] = useState(false);
  const [message, setMessage] = useState('');
  const recog = useRef<{ stop: () => void } | null>(null);
  useEffect(() => () => recog.current?.stop(), []);
  const toggle = () => {
    setMessage('');
    const w = window as Window & { SpeechRecognition?: new () => any; webkitSpeechRecognition?: new () => any };
    const Recognition = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Recognition) { setMessage('Voice input isn’t supported in this browser. You can type your question instead.'); return; }
    if (listening) { recog.current?.stop(); setListening(false); return; }
    try {
      const instance = new Recognition();
      instance.lang = languageCode === 'auto' ? (navigator.language || 'en-IN') : languageCode; instance.continuous = false; instance.interimResults = false; instance.maxAlternatives = 1;
      instance.onstart = () => { setListening(true); setMessage('Listening. Speak naturally, then pause.'); };
      instance.onresult = (event: any) => { const text = event.results?.[0]?.[0]?.transcript; if (text) onTranscript(text); };
      instance.onerror = (event: any) => {
        setListening(false);
        setMessage(event.error === 'not-allowed' || event.error === 'service-not-allowed'
          ? 'Microphone access was blocked. Allow microphone access in your browser settings, then try again.'
          : event.error === 'no-speech' ? 'We didn’t hear anything. Tap the microphone and try again.' : 'Voice input could not start. Check your connection or type your question.');
      };
      instance.onend = () => setListening(false);
      recog.current = instance; instance.start();
    } catch { setListening(false); setMessage('Could not open the microphone. You can type your question instead.'); }
  };
  return <div className="flex flex-col items-start gap-2"><Button type="button" variant={listening ? 'danger' : 'outline'} className={listening ? 'animate-pulse' : ''} onClick={toggle} aria-pressed={listening} data-testid="button-start-listening">{listening ? <><MicOff size={17} /> Stop listening</> : <><Mic size={17} /> Speak</>}</Button>{message && <p role="status" className={`max-w-sm text-xs leading-5 ${listening ? 'text-primary' : 'text-muted-foreground'}`}>{message}</p>}</div>;
}

function ChatPage() {
  const [, params] = useRoute('/chat/:conversationId');
  const [, setLocation] = useLocation();
  const conversationId = params?.conversationId || '';
  const [draft, setDraft] = useState('');
  const [language, setLanguage] = useState('en-US');
  const [voiceDraft, setVoiceDraft] = useState('');
  const [lastQuestion, setLastQuestion] = useState('');
  const queryClient = useQueryClient();
  const messages = useGetConversationMessages(conversationId, { query: { enabled: !!conversationId, queryKey: getGetConversationMessagesQueryKey(conversationId) } });
  const prefs = useGetPreferences();
  const advisory = useCreateAdvisory();
  const sentInitial = useRef('');
  useEffect(() => { if (prefs.data?.preferredLanguage) setLanguage(prefs.data.preferredLanguage); }, [prefs.data?.preferredLanguage]);
  const speak = (text: string, code: string) => {
    if (!('speechSynthesis' in window)) { setVoiceDraft('Speech playback is not supported by this browser.'); return; }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = code;
    utterance.rate = prefs.data?.speechRate ?? 1;
    const voices = window.speechSynthesis.getVoices();
    const preferred = prefs.data?.preferredVoice;
    const voice = voices.find(v => preferred && v.name === preferred) || voices.find(v => v.lang.toLowerCase().startsWith(code.slice(0, 2).toLowerCase()));
    if (voice) utterance.voice = voice;
    utterance.onerror = () => setVoiceDraft('Speech playback could not start. Check that your device has a voice for this language.');
    window.speechSynthesis.speak(utterance);
  };
  const send = (text: string) => {
    if (!text.trim() || advisory.isPending) return;
    setLastQuestion(text.trim());
    setDraft('');
    setVoiceDraft('');
    advisory.mutate({ data: { conversationId, query: text.trim(), activeLanguageCode: language } }, {
      onSuccess: response => {
        queryClient.invalidateQueries({ queryKey: getGetConversationMessagesQueryKey(conversationId) });
        queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        const spoken = response.advisoryResponse;
        const audioCode = response.languageCode || language;
        if (prefs.data?.autoPlayTts) speak(spoken, audioCode);
      },
    });
  };
  useEffect(() => {
    const initial = new URLSearchParams(window.location.search).get('question') || '';
    if (initial && sentInitial.current !== conversationId) { sentInitial.current = conversationId; send(initial); setLocation(`/chat/${conversationId}`, { replace: true }); }
  }, [conversationId]);
  useEffect(() => () => { if ('speechSynthesis' in window) window.speechSynthesis.cancel(); }, []);
  return <div className="page-enter">
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><button onClick={() => setLocation('/dashboard')} className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-primary"><ArrowLeft size={16} /> Your workspace</button><div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground"><span className="size-2 rounded-full bg-[#6b9d58]" /> Private consultation</div></div>
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 text-center"><span className="mx-auto grid size-12 place-items-center rounded-2xl bg-secondary text-primary"><Sprout size={23} /></span><p className="mt-3 text-[10px] font-extrabold uppercase tracking-[.18em] text-accent">Let’s find a useful next step</p><h1 className="font-display mt-1 text-2xl font-extrabold tracking-[-.04em] sm:text-3xl">Your farm consultation</h1><p className="mt-1 text-sm text-muted-foreground">Ask a follow-up whenever you’re ready.</p></div>
      <div className="min-h-[38vh] space-y-4 pb-5">
        {messages.isLoading && <div className="rounded-2xl border border-border bg-card p-5"><Skeleton lines={3} /></div>}
        {messages.isError && <StatusMessage>We couldn’t reload this consultation. <button onClick={() => messages.refetch()} className="ml-1 font-bold underline">Try again</button><Link href="/history" className="ml-3 font-bold underline">Go to history</Link></StatusMessage>}
        {!messages.isLoading && !messages.isError && messages.data?.length === 0 && !advisory.isPending && <div className="rounded-2xl border border-dashed border-border bg-card/60 p-6 text-center"><MessageCircle className="mx-auto text-primary" size={26} /><h2 className="font-display mt-3 font-bold">What’s happening in your field?</h2><p className="mt-1 text-sm text-muted-foreground">Tell us what you see, what you’ve tried, or what you’re planning.</p></div>}
        {messages.data?.map(message => <article key={message.id} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`} data-testid={`message-${message.sender}-${message.id}`}><div className={`max-w-[92%] rounded-2xl p-4 sm:max-w-[82%] ${message.sender === 'user' ? 'rounded-br-md bg-primary text-primary-foreground' : 'rounded-bl-md border border-border bg-card soft-shadow'}`}><div className="mb-2 flex items-center justify-between gap-4 text-[10px] font-bold uppercase tracking-[.12em] opacity-65"><span>{message.sender === 'user' ? 'You' : 'AgriVaanix'}{message.detectedLanguage ? ` · ${message.detectedLanguage}` : ''}</span><span>{new Date(message.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span></div><p className="whitespace-pre-wrap text-sm leading-7 sm:text-base">{message.content}</p>{message.sender === 'assistant' && !!message.actionSteps?.length && <div className="mt-4 rounded-xl bg-background p-4"><p className="mb-2 text-[10px] font-extrabold uppercase tracking-[.14em] text-primary">Try these next steps</p><ol className="space-y-2">{message.actionSteps.map((step, index) => <li key={`${message.id}-${index}`} className="flex gap-2 text-sm leading-6"><span className="grid size-5 shrink-0 place-items-center rounded-full bg-secondary text-[10px] font-extrabold text-primary">{index + 1}</span><span>{step}</span></li>)}</ol></div>}{message.sender === 'assistant' && message.safetyWarning && <div className="mt-3 flex items-start gap-2 rounded-xl border border-[#e8d6a9] bg-[#fbf3df] p-3 text-sm leading-6 text-[#634e20]"><ShieldAlert size={16} className="mt-1 shrink-0" /><span>{message.safetyWarning}</span></div>}{message.sender === 'assistant' && <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3"><span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] font-bold text-primary">{domainLabels[message.domainCategory] || message.domainCategory}</span><button onClick={() => speak(message.content, message.languageCode || language)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-muted-foreground hover:bg-muted hover:text-primary" data-testid={`button-listen-${message.id}`}><Volume2 size={14} /> Listen</button></div>}</div></article>)}
        {advisory.isPending && <div className="flex justify-start"><div className="w-[82%] rounded-2xl rounded-bl-md border border-border bg-card p-5"><div className="flex items-center gap-2 text-sm font-semibold text-primary"><span className="flex gap-1"><i className="size-1.5 animate-bounce rounded-full bg-primary" /><i className="size-1.5 animate-bounce rounded-full bg-primary [animation-delay:120ms]" /><i className="size-1.5 animate-bounce rounded-full bg-primary [animation-delay:240ms]" /></span>Thinking through your question…</div><div className="mt-4 space-y-2"><div className="h-3 w-full animate-pulse rounded bg-muted" /><div className="h-3 w-4/5 animate-pulse rounded bg-muted" /></div></div></div>}
        {advisory.isError && <StatusMessage>{getErrorText(advisory.error)} <button onClick={() => lastQuestion && send(lastQuestion)} className="ml-1 font-bold underline">Retry your question</button></StatusMessage>}
        {voiceDraft && <StatusMessage tone="info">{voiceDraft}</StatusMessage>}
      </div>
      <div className="sticky bottom-3 rounded-2xl bg-background/90 pt-2 backdrop-blur-xl">
        <div className="mb-2 flex items-center justify-between gap-3"><div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground"><span>Reply language</span><select aria-label="Reply language" value={language} onChange={e => setLanguage(e.target.value)} className="rounded-lg border border-border bg-card px-2 py-1.5 text-xs font-bold text-foreground" data-testid="select-chat-language">{languageChoices.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}</select></div><button type="button" onClick={() => { window.speechSynthesis?.cancel(); setVoiceDraft('Playback stopped.'); }} className="text-xs font-bold text-muted-foreground hover:text-primary" data-testid="button-stop-audio"><VolumeX size={14} className="mr-1 inline" /> Stop audio</button></div>
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-3 shadow-lg sm:flex-row sm:items-end"><VoiceControl languageCode={language} onTranscript={text => { setDraft(text); document.querySelector<HTMLTextAreaElement>('[data-testid="input-chat-question"]')?.focus(); }} /><div className="min-w-0 flex-1"><textarea data-testid="input-chat-question" rows={2} value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(draft); } }} placeholder="Ask a follow-up…" className="w-full resize-none bg-transparent p-2 text-sm leading-6 outline-none placeholder:text-muted-foreground/70" /></div><Button disabled={advisory.isPending || !draft.trim()} onClick={() => send(draft)} data-testid="button-chat-send">{advisory.isPending ? 'Sending…' : <><Send size={16} /> Send</>}</Button></div>
        <p className="mt-2 text-center text-[10px] text-muted-foreground">Enter to send · Shift + Enter for a new line · Check high-risk decisions with a local expert.</p>
      </div>
    </div>
  </div>;
}

function HistoryPage() {
  const conversations = useListConversations();
  const deleteMutation = useDeleteConversation();
  const queryClient = useQueryClient();
  const [removing, setRemoving] = useState('');
  const remove = (item: Conversation) => {
    if (!window.confirm(`Delete “${item.title || 'this consultation'}” and its messages? This cannot be undone.`)) return;
    setRemoving(item.id);
    deleteMutation.mutate({ conversationId: item.id }, {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() }); queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() }); },
      onSettled: () => setRemoving(''),
    });
  };
  return <div className="page-enter"><PageTitle eyebrow="Your field notebook" title="Past consultations" description="Reopen an answer, pick up where you left off, or clear a conversation you no longer need." />
    {deleteMutation.isError && <div className="mb-4"><StatusMessage>{getErrorText(deleteMutation.error)}</StatusMessage></div>}
    <div className="mb-4 flex items-center justify-between"><span className="text-sm font-semibold text-muted-foreground">{conversations.data?.length ?? 0} saved {conversations.data?.length === 1 ? 'conversation' : 'conversations'}</span><Button variant="outline" onClick={() => conversations.refetch()} disabled={conversations.isFetching} data-testid="button-reload-history"><Activity size={15} className={conversations.isFetching ? 'animate-pulse' : ''} /> Refresh list</Button></div>
    {conversations.isLoading ? <div className="rounded-2xl border border-border bg-card p-5"><Skeleton lines={5} /></div> : conversations.isError ? <StatusMessage>Couldn’t load your history. <button onClick={() => conversations.refetch()} className="ml-1 font-bold underline">Try again</button></StatusMessage> : conversations.data?.length ? <div className="space-y-3">{conversations.data.map((item, i) => <article key={item.id} className="group flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4 transition hover:border-primary/30 hover:shadow-md sm:flex-nowrap sm:p-5" data-testid={`card-history-${item.id}`}><span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-secondary text-primary"><MessageCircle size={21} /></span><div className="min-w-[55%] flex-1"><Link href={`/chat/${item.id}`} className="font-display block text-lg font-bold hover:text-primary">{item.title || 'Field consultation'}</Link><p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{item.lastMessage || 'Continue this conversation'}</p><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-semibold text-muted-foreground"><span className="inline-flex items-center gap-1"><Clock3 size={12} /> {new Date(item.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span><span>{item.messageCount} messages</span><span>{item.activeLanguage}</span></div></div><div className="flex w-full items-center gap-2 sm:w-auto"><Link href={`/chat/${item.id}`} className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-3 text-sm font-bold text-primary-foreground sm:flex-none" data-testid={`link-reopen-${item.id}`}>Continue <ArrowRight size={15} /></Link><Button variant="quiet" disabled={removing === item.id} onClick={() => remove(item)} aria-label={`Delete ${item.title || 'consultation'}`} data-testid={`button-delete-${item.id}`}><Trash2 size={17} /> <span className="sm:hidden">Delete</span></Button></div>{i === 0 && <span className="sr-only">Most recent</span>}</article>)}</div> : <div className="rounded-2xl border border-dashed border-border bg-card/60 p-10 text-center"><History className="mx-auto text-primary" size={30} /><h2 className="font-display mt-3 text-xl font-bold">No consultations yet</h2><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">When a question comes up in the field, start here. Your conversations will be kept in this notebook.</p><Link href="/dashboard" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground">Ask your first question <ArrowRight size={16} /></Link></div>}
  </div>;
}

function FarmProfilePage() {
  const profile = useGetFarmProfile();
  const update = useUpdateFarmProfile();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FarmProfileInput>({ farmLocation: '', landSizeAcres: 1, soilType: 'loam', primaryCrops: [], irrigationSource: 'rainfed' });
  const [cropInput, setCropInput] = useState('');
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (profile.data && !loaded) {
      setLoaded(true);
      setForm({ farmLocation: profile.data.farmLocation, landSizeAcres: profile.data.landSizeAcres, soilType: profile.data.soilType, primaryCrops: profile.data.primaryCrops, irrigationSource: profile.data.irrigationSource });
    }
  }, [profile.data, loaded]);
  const set = <K extends keyof FarmProfileInput>(key: K, value: FarmProfileInput[K]) => setForm(old => ({ ...old, [key]: value }));
  const addCrop = () => { const crop = cropInput.trim(); if (crop && !form.primaryCrops.some(x => x.toLowerCase() === crop.toLowerCase())) set('primaryCrops', [...form.primaryCrops, crop]); setCropInput(''); };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    update.mutate({ data: form }, { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetFarmProfileQueryKey() }); queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() }); } });
  };
  return <div className="page-enter"><PageTitle eyebrow="Your fields, your context" title="My farm profile" description="These details help shape advice around your growing conditions. Change them whenever your farm changes." />
    {profile.isLoading ? <div className="rounded-2xl border border-border bg-card p-6"><Skeleton lines={6} /></div> : <form onSubmit={submit} className="max-w-3xl rounded-2xl border border-border bg-card p-5 soft-shadow sm:p-8">
      {profile.isError && <div className="mb-5"><StatusMessage tone="info">Your saved details could not be loaded. You can still enter them below. <button type="button" onClick={() => profile.refetch()} className="ml-1 font-bold underline">Try again</button></StatusMessage></div>}
      {update.isSuccess && <div className="mb-5"><StatusMessage tone="success"><Check size={16} className="mr-2 inline" />Farm profile saved. Your next advice can use these details.</StatusMessage></div>}
      {update.isError && <div className="mb-5"><StatusMessage>{getErrorText(update.error)}</StatusMessage></div>}
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block sm:col-span-2"><span className="mb-2 block text-sm font-bold">Farm location</span><span className="mb-2 block text-xs text-muted-foreground">Village, district or nearest town</span><input required minLength={2} maxLength={255} value={form.farmLocation} onChange={e => set('farmLocation', e.target.value)} className="field" placeholder="For example, Nalgonda, Telangana" data-testid="input-farm-location" /></label>
        <label className="block"><span className="mb-2 block text-sm font-bold">Land size</span><div className="flex items-center gap-2"><input required type="number" min="0.01" max="99999" step="0.01" value={form.landSizeAcres} onChange={e => set('landSizeAcres', Number(e.target.value))} className="field" data-testid="input-land-size" /><span className="text-sm font-semibold text-muted-foreground">acres</span></div></label>
        <label className="block"><span className="mb-2 block text-sm font-bold">Soil type</span><select value={form.soilType} onChange={e => set('soilType', e.target.value as FarmProfileInput['soilType'])} className="field" data-testid="select-soil-type">{[['clay','Clay'],['sandy','Sandy'],['loam','Loam'],['black','Black'],['red','Red'],['alluvial','Alluvial'],['other','Other / not sure']].map(([v,l]) => <option value={v} key={v}>{l}</option>)}</select></label>
        <label className="block"><span className="mb-2 block text-sm font-bold">Main water source</span><select value={form.irrigationSource} onChange={e => set('irrigationSource', e.target.value as FarmProfileInput['irrigationSource'])} className="field" data-testid="select-irrigation">{[['rainfed','Rainfed'],['borewell','Borewell'],['canal','Canal'],['drip','Drip irrigation'],['sprinkler','Sprinkler']].map(([v,l]) => <option value={v} key={v}>{l}</option>)}</select></label>
        <div><span className="mb-2 block text-sm font-bold">Primary crops</span><p className="mb-2 text-xs text-muted-foreground">Add the crops you grow most often.</p><div className="flex gap-2"><input value={cropInput} maxLength={80} onChange={e => setCropInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCrop(); } }} className="field" placeholder="e.g. cotton" data-testid="input-crop" /><Button type="button" variant="outline" onClick={addCrop} aria-label="Add crop"><Plus size={17} /></Button></div></div>
        <div className="sm:col-span-2">{form.primaryCrops.length > 0 ? <div className="flex flex-wrap gap-2">{form.primaryCrops.map(crop => <span key={crop} className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-sm font-semibold text-primary">{crop}<button type="button" aria-label={`Remove ${crop}`} onClick={() => set('primaryCrops', form.primaryCrops.filter(x => x !== crop))} className="rounded-full hover:text-destructive"><X size={14} /></button></span>)}</div> : <StatusMessage tone="info">Add at least one crop to save your farm profile.</StatusMessage>}</div>
      </div>
      <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5"><p className="text-xs text-muted-foreground">{profile.data?.updatedAt ? `Last updated ${new Date(profile.data.updatedAt).toLocaleDateString()}` : 'Your details are only used to make advice more relevant.'}</p><Button disabled={update.isPending || form.primaryCrops.length === 0} data-testid="button-save-farm">{update.isPending ? 'Saving…' : <><Check size={16} /> Save farm details</>}</Button></div>
    </form>}
  </div>;
}

function SettingsPage() {
  const preferences = useGetPreferences();
  const save = useUpdatePreferences();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<PreferencesInput>({ preferredLanguage: 'en-US', speechRate: 1, autoPlayTts: false, preferredVoice: '' });
  const [initialized, setInitialized] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState('');
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  useEffect(() => {
    if (preferences.data && !initialized) {
      setInitialized(true);
      setForm({ preferredLanguage: preferences.data.preferredLanguage, speechRate: preferences.data.speechRate, autoPlayTts: preferences.data.autoPlayTts, preferredVoice: preferences.data.preferredVoice });
    }
  }, [preferences.data, initialized]);
  useEffect(() => {
    if ('speechSynthesis' in window) {
      const load = () => setAvailableVoices(window.speechSynthesis.getVoices());
      load(); window.speechSynthesis.addEventListener('voiceschanged', load);
      return () => window.speechSynthesis.removeEventListener('voiceschanged', load);
    }
    return;
  }, []);
  const submit = (e: FormEvent) => { e.preventDefault(); save.mutate({ data: form }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetPreferencesQueryKey() }) }); };
  const preview = () => {
    if (!('speechSynthesis' in window)) { setVoiceStatus('Speech playback isn’t supported in this browser.'); return; }
    window.speechSynthesis.cancel();
    const lang = languageChoices.find(l => l.code === form.preferredLanguage)?.code || 'en-US';
    const message = lang === 'hi-IN' ? 'नमस्ते। आपकी फसल के लिए व्यावहारिक सलाह, आपकी भाषा में।' : lang === 'te-IN' ? 'నమస్కారం. మీ పంటకు ఉపయోగకరమైన సలహా.' : 'Hello. Practical advice for your farm, in your language.';
    const utterance = new SpeechSynthesisUtterance(message); utterance.lang = lang; utterance.rate = form.speechRate;
    const voice = availableVoices.find(v => v.name === form.preferredVoice) || availableVoices.find(v => v.lang.startsWith(lang.slice(0, 2)));
    if (voice) utterance.voice = voice;
    utterance.onstart = () => setVoiceStatus(`Playing ${voice?.name || 'the device’s default voice'}.`);
    utterance.onerror = () => setVoiceStatus('Could not play the voice sample. Check your device speech settings.');
    utterance.onend = () => setVoiceStatus('Sample finished.');
    window.speechSynthesis.speak(utterance);
  };
  return <div className="page-enter"><PageTitle eyebrow="Make it feel like yours" title="Language & speech" description="Choose how advice is read out and how you’d like to hear it." />
    {preferences.isLoading ? <div className="max-w-3xl rounded-2xl border border-border bg-card p-6"><Skeleton lines={5} /></div> : preferences.isError ? <StatusMessage>We couldn’t load your preferences. <button onClick={() => preferences.refetch()} className="ml-1 font-bold underline">Try again</button></StatusMessage> : <form onSubmit={submit} className="max-w-3xl space-y-5">
      {save.isSuccess && <StatusMessage tone="success"><Check size={16} className="mr-2 inline" />Preferences saved.</StatusMessage>}{save.isError && <StatusMessage>{getErrorText(save.error)}</StatusMessage>}
       <section className="rounded-2xl border border-border bg-card p-5 sm:p-7"><div className="flex items-start gap-3"><span className="grid size-10 place-items-center rounded-xl bg-secondary text-primary"><MessageCircle size={19} /></span><div><h2 className="font-display text-lg font-bold">Your language</h2><p className="mt-1 text-sm text-muted-foreground">You can change this for any conversation, too.</p></div></div><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{languagePreferenceChoices.map(item => <button type="button" key={item.code} onClick={() => setForm(f => ({ ...f, preferredLanguage: item.code }))} className={`rounded-xl border p-4 text-left transition ${form.preferredLanguage === item.code ? 'border-primary bg-secondary/50 ring-1 ring-primary' : 'border-border hover:bg-muted'}`} aria-pressed={form.preferredLanguage === item.code} data-testid={`button-pref-language-${item.short}`}><span className="block text-lg font-bold">{item.label}</span><span className="mt-1 block text-xs text-muted-foreground">{item.code === 'auto' ? 'Match each question' : item.code === 'en-US' ? 'English' : item.code === 'hi-IN' ? 'Hindi' : 'Telugu'}</span></button>)}</div></section>
      <section className="rounded-2xl border border-border bg-card p-5 sm:p-7"><div className="flex items-start gap-3"><span className="grid size-10 place-items-center rounded-xl bg-[#f1e7cb] text-[#816425]"><Volume2 size={19} /></span><div><h2 className="font-display text-lg font-bold">Spoken answers</h2><p className="mt-1 text-sm text-muted-foreground">Uses the speech voices available on your device.</p></div></div>
        <label className="mt-6 flex cursor-pointer items-center justify-between gap-4 rounded-xl bg-background p-4"><span><strong className="block text-sm">Read answers aloud automatically</strong><small className="mt-1 block text-xs text-muted-foreground">You can stop playback at any time in a consultation.</small></span><input type="checkbox" checked={form.autoPlayTts} onChange={e => setForm(f => ({ ...f, autoPlayTts: e.target.checked }))} className="size-5 accent-primary" data-testid="toggle-auto-play" /></label>
        <label className="mt-5 block"><span className="mb-2 block text-sm font-bold">Voice</span><select value={form.preferredVoice} onChange={e => setForm(f => ({ ...f, preferredVoice: e.target.value }))} className="field" data-testid="select-voice"><option value="">Use a voice for my language</option>{availableVoices.map(v => <option value={v.name} key={`${v.name}-${v.lang}`}>{v.name} · {v.lang}</option>)}</select><small className="mt-2 block text-xs text-muted-foreground">{availableVoices.length ? `${availableVoices.length} voices available on this device` : 'Voice options depend on the browser and device.'}</small></label>
        <div className="mt-5"><div className="mb-2 flex items-center justify-between"><label htmlFor="speech-rate" className="text-sm font-bold">Speaking speed</label><span className="rounded-lg bg-secondary px-2 py-1 text-xs font-bold text-primary">{form.speechRate.toFixed(1)}×</span></div><input id="speech-rate" type="range" min=".5" max="2" step=".1" value={form.speechRate} onChange={e => setForm(f => ({ ...f, speechRate: Number(e.target.value) }))} className="w-full accent-primary" data-testid="input-speech-rate" /><div className="flex justify-between text-[10px] text-muted-foreground"><span>Slow</span><span>Fast</span></div></div>
        <div className="mt-5 flex flex-wrap items-center gap-3"><Button type="button" variant="outline" onClick={preview} data-testid="button-preview-voice"><AudioLines size={16} /> Play a sample</Button><Button type="button" variant="quiet" onClick={() => { window.speechSynthesis?.cancel(); setVoiceStatus('Playback stopped.'); }} data-testid="button-stop-voice"><VolumeX size={16} /> Stop</Button><span role="status" className="text-xs text-muted-foreground">{voiceStatus}</span></div>
      </section>
      <div className="flex justify-end"><Button disabled={save.isPending} data-testid="button-save-preferences">{save.isPending ? 'Saving…' : <><Check size={16} /> Save preferences</>}</Button></div>
    </form>}
  </div>;
}

function HelpPage() {
  const topics = [
    { number: '01', title: 'Ask one thing at a time', body: 'Describe what you can see, when it began, and the crop or field area involved. A little detail helps us give a useful next step.' },
    { number: '02', title: 'Speak or type in your language', body: 'Tap Speak in a consultation and allow microphone access when your browser asks. Pause when you’re finished. Your words are sent as text to get advice; no audio recording is stored here.' },
    { number: '03', title: 'Make your farm profile useful', body: 'Location, soil type, crops and water source give context to questions about planting, irrigation and soil care.' },
    { number: '04', title: 'Listen to an answer', body: 'Use Listen under an answer to hear it. Choose a voice and speed in preferences. Audio is produced by your device’s built-in speech service.' },
    { number: '05', title: 'Treat advice as a starting point', body: 'For pesticide use, severe crop damage, animal health, or a decision involving significant cost, check with a local agriculture officer or qualified expert before acting.' },
  ];
  return <div className="page-enter"><PageTitle eyebrow="Here when you need it" title="Help & guidance" description="A few practical tips for getting clear answers and using voice comfortably." />
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]"><div className="space-y-3">{topics.map(topic => <details key={topic.number} className="group rounded-2xl border border-border bg-card p-5 open:bg-card sm:p-6"><summary className="flex cursor-pointer list-none items-center gap-4"><span className="font-display text-sm font-extrabold text-accent">{topic.number}</span><strong className="flex-1 font-display text-lg font-bold">{topic.title}</strong><ChevronDown size={18} className="text-muted-foreground transition group-open:rotate-180" /></summary><p className="ml-10 mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">{topic.body}</p></details>)}</div>
      <aside className="space-y-4"><div className="rounded-2xl bg-primary p-5 text-primary-foreground"><span className="grid size-10 place-items-center rounded-xl bg-white/10"><Mic size={20} /></span><h2 className="font-display mt-4 text-xl font-bold">Voice not working?</h2><p className="mt-2 text-sm leading-6 text-primary-foreground/75">Use a recent browser, allow microphone access, and try in a quiet place. If speech recognition isn’t supported, typing is always available.</p><Link href="/settings" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-sidebar-primary">Speech preferences <ArrowRight size={15} /></Link></div>
        <div className="rounded-2xl border border-[#e8d6a9] bg-[#fbf3df] p-5 text-[#634e20]"><ShieldAlert size={20} /><h2 className="font-display mt-3 font-bold">Use extra care with treatments</h2><p className="mt-2 text-sm leading-6">Always follow the product label and local regulations. Never mix products based on an online answer alone.</p></div>
        <div className="rounded-2xl border border-border bg-card p-5"><h2 className="font-display font-bold">Ready to ask?</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Take your question back to your workspace.</p><Link href="/dashboard" className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-primary">Ask for advice <ArrowRight size={15} /></Link></div>
      </aside>
    </div>
  </div>;
}

function HelpRoute() {
  const { isSignedIn } = useUser();
  if (isSignedIn) return <AppShell><HelpPage /></AppShell>;
  return <div className="min-h-[100dvh] bg-background"><header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8"><Brand /><Link href="/sign-in" className="rounded-xl px-4 py-2 text-sm font-bold text-primary hover:bg-secondary">Sign in</Link></header><main className="mx-auto max-w-6xl px-4 py-7 sm:px-7 sm:py-9"><HelpPage /></main></div>;
}

function ProtectedApp({ component: Page }: { component: () => ReactNode }) {
  return <AuthRedirect><AppShell><Page /></AppShell></AuthRedirect>;
}

function HomeRedirect() {
  const { isSignedIn } = useUser();
  return isSignedIn ? <Redirect to="/dashboard" /> : <LandingPage />;
}
function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const client = useQueryClient();
  const prior = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const id = user?.id ?? null;
      if (prior.current !== undefined && prior.current !== id) client.clear();
      prior.current = id;
    });
    return unsubscribe;
  }, [addListener, client]);
  return null;
}
function RouterContent() {
  const [, setLocation] = useLocation();
  return <ClerkProvider
    publishableKey={clerkPubKey}
    proxyUrl={clerkProxyUrl}
    appearance={appearance}
    signInUrl={`${basePath}/sign-in`}
    signUpUrl={`${basePath}/sign-up`}
    localization={{
      signIn: { start: { title: 'Welcome back', subtitle: 'Let’s get back to your farm.' } },
      signUp: { start: { title: 'Join AgriVaanix', subtitle: 'Practical advice for the work you do.' } },
    }}
    routerPush={to => setLocation(stripBase(to))}
    routerReplace={to => setLocation(stripBase(to), { replace: true })}
  >
    <ClerkQueryClientCacheInvalidator />
    <Switch>
      <Route path="/" component={HomeRedirect} />
      <Route path="/login"><Redirect to="/sign-in" /></Route>
      <Route path="/register"><Redirect to="/sign-up" /></Route>
      <Route path="/sign-in/*?" component={SignInPage} />
      <Route path="/sign-up/*?" component={SignUpPage} />
      <Route path="/dashboard"><ProtectedApp component={DashboardPage} /></Route>
      <Route path="/chat/:conversationId"><ProtectedApp component={ChatPage} /></Route>
      <Route path="/history"><ProtectedApp component={HistoryPage} /></Route>
      <Route path="/farm-profile"><ProtectedApp component={FarmProfilePage} /></Route>
      <Route path="/settings"><ProtectedApp component={SettingsPage} /></Route>
      <Route path="/help" component={HelpRoute} />
      <Route component={NotFound} />
    </Switch>
  </ClerkProvider>;
}
function App() {
  if (!clerkPubKey) throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY.');
  return <QueryClientProvider client={queryClient}><WouterRouter base={basePath}><RouterContent /></WouterRouter></QueryClientProvider>;
}

export default App;
