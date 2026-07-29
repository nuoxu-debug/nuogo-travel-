import {
  ArrowRight,
  CalendarDays,
  Check,
  MapPin,
  Route,
  ShieldCheck,
  UserRoundPlus,
  X
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiRequest } from "../api/client.js";
import BrandLogo from "../components/BrandLogo.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";
import { useAnime } from "../hooks/useAnime.js";
import AppShell from "../layout/AppShell.jsx";

const destinationLabels = {
  huangshan: { en: "Huangshan", zh: "黄山" },
  hefei: { en: "Hefei", zh: "合肥" },
  anhui: { en: "Anhui", zh: "安徽" },
  chengdu: { en: "Chengdu", zh: "成都" }
};

const terminalKeys = {
  INVITATION_EXPIRED: "expiredTitle",
  INVITATION_REVOKED: "revokedTitle",
  INVITATION_CONSUMED: "consumedTitle",
  NOT_FOUND: "notFoundTitle"
};

function readableDestination(destination, language) {
  return destinationLabels[destination]?.[language]
    ?? destination?.replaceAll("_", " ")
    ?? "";
}

function formatDate(date, language) {
  return new Intl.DateTimeFormat(language === "zh" ? "zh-CN" : "en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric"
  }).format(new Date(`${date}T00:00:00`));
}

function StatePanel({ title, body, action, headingRef }) {
  return (
    <div className="mx-auto w-full max-w-xl border border-ink/10 bg-white p-6 shadow-panel sm:p-9">
      <BrandLogo />
      <h1 ref={headingRef} tabIndex="-1" className="mt-7 font-display text-3xl font-extrabold sm:text-4xl">
        {title}
      </h1>
      <p className="mt-4 max-w-lg leading-7 text-ink/60">{body}</p>
      {action}
    </div>
  );
}

export default function InvitationPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const { ready: authReady, user } = useAuth();
  const animate = useAnime();
  const surfaceRef = useRef(null);
  const headingRef = useRef(null);
  const [invitation, setInvitation] = useState(null);
  const [phase, setPhase] = useState("loading");
  const [terminalKey, setTerminalKey] = useState("");
  const [actionError, setActionError] = useState("");

  const invitationPath = `/invite/${token}`;
  const continuation = encodeURIComponent(invitationPath);
  const copy = (key) => t(`invitation.${key}`);

  useEffect(() => {
    let active = true;
    apiRequest(`/invitations/${token}`)
      .then((body) => {
        if (!active) return;
        setInvitation(body.invitation);
        setPhase("ready");
      })
      .catch((error) => {
        if (!active) return;
        setTerminalKey(terminalKeys[error.code] ?? "notFoundTitle");
        setPhase("terminal");
      });
    return () => {
      active = false;
    };
  }, [token]);

  useEffect(() => {
    if (!authReady || phase === "loading") return;
    animate({
      targets: surfaceRef.current,
      opacity: [0, 1],
      translateY: [12, 0],
      duration: 360,
      easing: "easeOutCubic"
    });
  }, [animate, authReady, phase]);

  useEffect(() => {
    if (phase === "terminal" || phase === "declined") {
      headingRef.current?.focus();
    }
  }, [phase]);

  const title = invitation?.trip?.title?.[language]
    ?? invitation?.trip?.title?.en
    ?? "";
  const role = invitation?.role === "viewer" ? "viewer" : "editor";
  const dates = useMemo(() => {
    if (!invitation?.trip) return "";
    return `${formatDate(invitation.trip.startDate, language)} – ${formatDate(invitation.trip.endDate, language)}`;
  }, [invitation, language]);

  async function decide(action) {
    setActionError("");
    setPhase(action === "accept" ? "accepting" : "declining");
    try {
      const body = await apiRequest(`/invitations/${token}/${action}`, {
        method: "POST"
      });
      if (action === "accept") {
        navigate(`/trip/${body.tripId}`, { replace: true });
      } else {
        setPhase("declined");
      }
    } catch {
      setActionError(copy("actionFailed"));
      setPhase("ready");
    }
  }

  const liveText = {
    loading: copy("loadingTitle"),
    ready: copy("readyStatus"),
    accepting: copy("accepting"),
    declining: copy("declining"),
    declined: copy("declinedTitle"),
    terminal: terminalKey ? copy(terminalKey) : copy("notFoundTitle")
  }[phase];

  if (!authReady || phase === "loading") {
    return (
      <AppShell hideFooter>
        <section className="grid min-h-[calc(100vh-68px)] place-items-center bg-mist px-5 py-14">
          <p role="status" aria-live="polite" className="sr-only">{liveText}</p>
          <StatePanel title={copy("loadingTitle")} body={copy("loadingBody")} />
        </section>
      </AppShell>
    );
  }

  if (phase === "terminal") {
    return (
      <AppShell hideFooter>
        <section className="grid min-h-[calc(100vh-68px)] place-items-center bg-mist px-5 py-14">
          <p role="status" aria-live="polite" className="sr-only">{liveText}</p>
          <div ref={surfaceRef} className="w-full opacity-0">
            <StatePanel
              headingRef={headingRef}
              title={copy(terminalKey)}
              body={copy("unavailableBody")}
              action={(
                <Link to="/planner" className="mt-7 inline-flex min-h-12 items-center gap-2 bg-ink px-5 font-bold text-white transition-transform hover:-translate-y-0.5">
                  {copy("backToPlanner")} <ArrowRight className="h-4 w-4" />
                </Link>
              )}
            />
          </div>
        </section>
      </AppShell>
    );
  }

  if (phase === "declined") {
    return (
      <AppShell hideFooter>
        <section className="grid min-h-[calc(100vh-68px)] place-items-center bg-mist px-5 py-14">
          <p role="status" aria-live="polite" className="sr-only">{liveText}</p>
          <div ref={surfaceRef} className="w-full opacity-0">
            <StatePanel
              headingRef={headingRef}
              title={copy("declinedTitle")}
              body={copy("declinedBody")}
              action={(
                <Link to="/planner" className="mt-7 inline-flex min-h-12 items-center gap-2 bg-lake px-5 font-bold text-white transition-transform hover:-translate-y-0.5">
                  {copy("planAnother")} <ArrowRight className="h-4 w-4" />
                </Link>
              )}
            />
          </div>
        </section>
      </AppShell>
    );
  }

  const busy = phase === "accepting" || phase === "declining";

  return (
    <AppShell hideFooter>
      <section className="min-h-[calc(100vh-68px)] bg-mist px-5 py-10 sm:px-8 sm:py-14">
        <p role="status" aria-live="polite" className="sr-only">{liveText}</p>
        <div ref={surfaceRef} className="mx-auto grid w-full max-w-5xl overflow-hidden border border-ink/10 bg-white opacity-0 shadow-panel lg:grid-cols-[.82fr_1.18fr]">
          <aside className="relative overflow-hidden bg-ink p-7 text-white sm:p-9">
            <div className="flex items-center gap-3">
              <BrandLogo />
              <div>
                <p className="text-xs font-extrabold uppercase text-gold">Nuogo</p>
                <p className="mt-1 text-sm text-white/62">{copy("eyebrow")}</p>
              </div>
            </div>

            <div className="relative mt-12 space-y-8 border-l border-dashed border-white/28 pl-7">
              {[
                [MapPin, copy("destination"), readableDestination(invitation.trip.destination, language)],
                [CalendarDays, copy("dates"), dates],
                [ShieldCheck, copy("offeredAccess"), copy(role)]
              ].map(([Icon, label, value], index) => (
                <div key={label} className="relative">
                  <span className={`absolute -left-[42px] top-0 grid h-7 w-7 place-items-center rounded-full border-2 border-white bg-ink ${index === 2 ? "text-gold" : "text-white"}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <p className="text-xs font-bold text-white/48">{label}</p>
                  <p className="mt-1 font-bold leading-6">{value}</p>
                </div>
              ))}
            </div>

            <p className="mt-12 border-t border-white/12 pt-5 text-sm leading-6 text-white/58">
              {copy(`${role}Body`)}
            </p>
          </aside>

          <article className="flex flex-col justify-center p-7 sm:p-10 lg:p-12">
            <div className="flex items-center gap-2 text-xs font-extrabold uppercase text-jade">
              <Route className="h-4 w-4" />
              {copy("eyebrow")}
            </div>
            <h1 className="mt-5 max-w-2xl font-display text-3xl font-extrabold leading-tight sm:text-5xl">
              {copy("titlePrefix")}{language === "zh" ? "" : " "}{title}
            </h1>
            <p className="mt-5 flex items-center gap-2 text-sm text-ink/55">
              <UserRoundPlus className="h-4 w-4 text-vermilion" />
              {copy("invitedBy")} <strong className="text-ink">{invitation.owner.name}</strong>
            </p>

            <div className="my-8 border-y border-dashed border-ink/15 py-6">
              <p className="text-xs font-bold uppercase text-ink/42">{copy("offeredAccess")}</p>
              <p className="mt-2 font-display text-2xl font-bold">{copy(role)}</p>
              <p className="mt-2 max-w-xl text-sm leading-6 text-ink/58">{copy(`${role}Body`)}</p>
            </div>

            {actionError && (
              <p role="alert" className="mb-5 border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-800">
                {actionError}
              </p>
            )}

            {user ? (
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => decide("accept")}
                  className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 bg-lake px-5 font-bold text-white shadow-lift transition-transform hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-55"
                >
                  <Check className="h-4 w-4" />
                  {phase === "accepting" ? copy("accepting") : copy("accept")}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => decide("decline")}
                  className="inline-flex min-h-12 items-center justify-center gap-2 border border-ink/15 px-5 font-bold text-ink transition-colors hover:border-ink/35 disabled:cursor-wait disabled:opacity-55"
                >
                  <X className="h-4 w-4" />
                  {phase === "declining" ? copy("declining") : copy("decline")}
                </button>
              </div>
            ) : (
              <>
                <p className="mb-5 text-sm leading-6 text-ink/58">{copy("signedOutBody")}</p>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Link
                    to={`/login?returnTo=${continuation}`}
                    className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 bg-lake px-5 font-bold text-white shadow-lift transition-transform hover:-translate-y-0.5"
                  >
                    {copy("signInToJoin")} <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    to={`/register?returnTo=${continuation}`}
                    className="inline-flex min-h-12 items-center justify-center border border-ink/15 px-5 font-bold text-ink transition-colors hover:border-ink/35"
                  >
                    {copy("createAccount")}
                  </Link>
                </div>
              </>
            )}
          </article>
        </div>
      </section>
    </AppShell>
  );
}
