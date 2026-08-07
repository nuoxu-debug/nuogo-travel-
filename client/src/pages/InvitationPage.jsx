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
import { chinaCities } from "@nuogo/shared/constants";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiRequest } from "../api/client.js";
import BrandLogo from "../components/BrandLogo.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";
import { useAnime } from "../hooks/useAnime.js";
import AppShell from "../layout/AppShell.jsx";

const destinationLabels = new Map(
  chinaCities.map(({ id, name }) => [id, name])
);

const terminalKeys = {
  INVITATION_EXPIRED: "expiredTitle",
  INVITATION_REVOKED: "revokedTitle",
  INVITATION_CONSUMED: "consumedTitle",
  NOT_FOUND: "notFoundTitle"
};

function initialInvitationState(token) {
  return {
    token,
    invitation: null,
    phase: "loading",
    terminalKey: "",
    actionError: ""
  };
}

function readableDestination(destination, language, fallback) {
  const labels = destinationLabels.get(destination);
  return labels?.[language] ?? labels?.en ?? fallback;
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
      <p className="mt-4 max-w-lg leading-7 text-ink/70">{body}</p>
      {action}
    </div>
  );
}

export default function InvitationPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const { logout, ready: authReady, user } = useAuth();
  const animate = useAnime();
  const surfaceRef = useRef(null);
  const headingRef = useRef(null);
  const activeTokenRef = useRef(token);
  activeTokenRef.current = token;
  const [storedState, setStoredState] = useState(() => initialInvitationState(token));
  const state = storedState.token === token
    ? storedState
    : initialInvitationState(token);
  const {
    actionError,
    invitation,
    phase,
    terminalKey
  } = state;

  const invitationPath = `/invite/${token}`;
  const continuation = encodeURIComponent(invitationPath);
  const copy = (key) => t(`invitation.${key}`);
  const setForToken = (requestToken, patch) => {
    setStoredState((current) => (
      current.token === requestToken ? { ...current, ...patch } : current
    ));
  };

  useEffect(() => {
    let active = true;
    setStoredState(initialInvitationState(token));
    apiRequest(`/invitations/${token}`)
      .then((body) => {
        if (!active) return;
        setStoredState({
          token,
          invitation: body.invitation,
          phase: "ready",
          terminalKey: "",
          actionError: ""
        });
      })
      .catch((error) => {
        if (!active) return;
        if (error.status === 401) {
          logout();
          setStoredState({
            ...initialInvitationState(token),
            phase: "authRequired"
          });
          return;
        }
        setStoredState({
          ...initialInvitationState(token),
          terminalKey: terminalKeys[error.code] ?? "notFoundTitle",
          phase: "terminal"
        });
      });
    return () => {
      active = false;
    };
  }, [logout, token]);

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
    if (
      phase === "terminal"
      || phase === "declined"
      || phase === "authRequired"
    ) {
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
    const decisionToken = token;
    setForToken(decisionToken, {
      actionError: "",
      phase: action === "accept" ? "accepting" : "declining"
    });
    try {
      const body = await apiRequest(`/invitations/${decisionToken}/${action}`, {
        method: "POST"
      });
      if (activeTokenRef.current !== decisionToken) return;
      if (action === "accept") {
        navigate(`/trip/${body.tripId}`, { replace: true });
      } else {
        setForToken(decisionToken, { phase: "declined" });
      }
    } catch (error) {
      if (activeTokenRef.current !== decisionToken) return;
      if (error.status === 401) {
        logout();
        setForToken(decisionToken, {
          actionError: "",
          phase: "authRequired"
        });
        return;
      }
      const nextTerminalKey = terminalKeys[error.code];
      if (nextTerminalKey) {
        setForToken(decisionToken, {
          actionError: "",
          phase: "terminal",
          terminalKey: nextTerminalKey
        });
        return;
      }
      setForToken(decisionToken, {
        actionError: copy("actionFailed"),
        phase: "ready"
      });
    }
  }

  async function checkMembership() {
    const decisionToken = token;
    setForToken(decisionToken, {
      actionError: "",
      phase: "checking"
    });
    try {
      const body = await apiRequest(`/invitations/${decisionToken}/accept`, {
        method: "POST"
      });
      if (activeTokenRef.current !== decisionToken) return;
      navigate(`/trip/${body.tripId}`, { replace: true });
    } catch (error) {
      if (activeTokenRef.current !== decisionToken) return;
      if (error.status === 401) {
        logout();
        setForToken(decisionToken, {
          actionError: "",
          phase: "authRequired"
        });
        return;
      }
      setForToken(decisionToken, {
        actionError: error.code === "INVITATION_CONSUMED"
          ? copy("membershipNotFound")
          : copy("actionFailed"),
        phase: "terminal",
        terminalKey: terminalKeys[error.code] ?? "consumedTitle"
      });
    }
  }

  const liveText = {
    loading: copy("loadingTitle"),
    ready: copy("readyStatus"),
    accepting: copy("accepting"),
    declining: copy("declining"),
    declined: copy("declinedTitle"),
    checking: copy("checkingMembership"),
    authRequired: copy("authRequiredTitle"),
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

  if (phase === "authRequired" && !invitation) {
    return (
      <AppShell hideFooter>
        <section className="grid min-h-[calc(100vh-68px)] place-items-center bg-mist px-5 py-14">
          <p role="status" aria-live="polite" className="sr-only">{liveText}</p>
          <div ref={surfaceRef} className="w-full opacity-0">
            <StatePanel
              headingRef={headingRef}
              title={copy("authRequiredTitle")}
              body={copy("sessionExpiredBody")}
              action={(
                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  <Link to={`/login?returnTo=${continuation}`} className="inline-flex min-h-12 items-center justify-center gap-2 bg-ink px-5 font-bold text-white">
                    {copy("signInToJoin")} <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link to={`/register?returnTo=${continuation}`} className="inline-flex min-h-12 items-center justify-center border border-ink/20 px-5 font-bold text-ink">
                    {copy("createAccount")}
                  </Link>
                </div>
              )}
            />
          </div>
        </section>
      </AppShell>
    );
  }

  if (phase === "terminal" || phase === "checking") {
    const consumed = terminalKey === "consumedTitle";
    return (
      <AppShell hideFooter>
        <section className="grid min-h-[calc(100vh-68px)] place-items-center bg-mist px-5 py-14">
          <p role="status" aria-live="polite" className="sr-only">{liveText}</p>
          <div ref={surfaceRef} className="w-full opacity-0">
            <StatePanel
              headingRef={headingRef}
              title={copy(terminalKey)}
              body={copy("unavailableBody")}
              action={consumed && user ? (
                <div className="mt-7">
                  {actionError && (
                    <p role="alert" className="mb-4 border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-800">
                      {actionError}
                    </p>
                  )}
                  <button
                    type="button"
                    disabled={phase === "checking"}
                    onClick={checkMembership}
                    className="inline-flex min-h-12 items-center justify-center gap-2 bg-ink px-5 font-bold text-white disabled:cursor-wait disabled:opacity-55"
                  >
                    <Check className="h-4 w-4" />
                    {phase === "checking"
                      ? copy("checkingMembership")
                      : copy("checkMembership")}
                  </button>
                </div>
              ) : (
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
                <Link to="/planner" className="mt-7 inline-flex min-h-12 items-center gap-2 bg-ink px-5 font-bold text-white transition-transform hover:-translate-y-0.5">
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
                <p className="mt-1 text-sm text-white/80">{copy("eyebrow")}</p>
              </div>
            </div>

            <div className="relative mt-12 space-y-8 border-l border-dashed border-white/28 pl-7">
              {[
                [MapPin, copy("destination"), readableDestination(
                  invitation.trip.destination,
                  language,
                  copy("unknownDestination")
                )],
                [CalendarDays, copy("dates"), dates],
                [ShieldCheck, copy("offeredAccess"), copy(role)]
              ].map(([Icon, label, value], index) => (
                <div key={label} className="relative">
                  <span className={`absolute -left-[42px] top-0 grid h-7 w-7 place-items-center rounded-full border-2 border-white bg-ink ${index === 2 ? "text-gold" : "text-white"}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <p className="text-xs font-bold text-white/75">{label}</p>
                  <p className="mt-1 font-bold leading-6">{value}</p>
                </div>
              ))}
            </div>

            <p className="mt-12 border-t border-white/20 pt-5 text-sm leading-6 text-white/80">
              {copy(`${role}Body`)}
            </p>
          </aside>

          <article className="flex flex-col justify-center p-7 sm:p-10 lg:p-12">
            <div className="flex items-center gap-2 text-xs font-extrabold uppercase text-ink">
              <Route className="h-4 w-4" />
              {copy("eyebrow")}
            </div>
            <h1 ref={headingRef} tabIndex="-1" className="mt-5 max-w-2xl font-display text-3xl font-extrabold leading-tight sm:text-5xl">
              {copy("titlePrefix")}{language === "zh" ? "" : " "}{title}
            </h1>
            <p className="mt-5 flex items-center gap-2 text-sm text-ink/70">
              <UserRoundPlus className="h-4 w-4 text-vermilion" />
              {copy("invitedBy")} <strong className="text-ink">{invitation.owner.name}</strong>
            </p>

            <div className="my-8 border-y border-dashed border-ink/15 py-6">
              <p className="text-xs font-bold uppercase text-ink/65">{copy("offeredAccess")}</p>
              <p className="mt-2 font-display text-2xl font-bold">{copy(role)}</p>
              <p className="mt-2 max-w-xl text-sm leading-6 text-ink/70">{copy(`${role}Body`)}</p>
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
                  className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 bg-ink px-5 font-bold text-white shadow-lift transition-transform hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-55"
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
                <p className="mb-5 text-sm leading-6 text-ink/70">
                  {phase === "authRequired"
                    ? copy("sessionExpiredBody")
                    : copy("signedOutBody")}
                </p>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Link
                    to={`/login?returnTo=${continuation}`}
                    className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 bg-ink px-5 font-bold text-white shadow-lift transition-transform hover:-translate-y-0.5"
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
