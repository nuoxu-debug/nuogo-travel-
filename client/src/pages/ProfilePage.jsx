import { KeyRound, LoaderCircle, RefreshCw, Save, ShieldAlert, Trash2, UserRound } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { apiRequest } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";
import AppShell from "../layout/AppShell.jsx";

const EMPTY_PROFILE = { name: "", email: "", preferredLanguage: "zh", accountType: "REGISTERED" };

function errorMessage(error, t) {
  if (error?.code === "CURRENT_PASSWORD_INVALID") return t("profile.currentPasswordIncorrect");
  return t("profile.requestFailed");
}

export default function ProfilePage() {
  const { ready, user, logout } = useAuth();
  const { setLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const nameRef = useRef(null);
  const currentPasswordRef = useRef(null);
  const newPasswordRef = useRef(null);
  const confirmPasswordRef = useRef(null);
  const deletionConfirmationRef = useRef(null);
  const deletionPasswordRef = useRef(null);
  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [loadState, setLoadState] = useState("loading");
  const [profileState, setProfileState] = useState({ busy: false, message: "", error: "", errors: {} });
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [passwordState, setPasswordState] = useState({ busy: false, message: "", error: "", errors: {} });
  const [deletion, setDeletion] = useState({ confirmation: "", currentPassword: "" });
  const [deletionState, setDeletionState] = useState({ busy: false, error: "", errors: {} });

  const loadProfile = useCallback(async () => {
    setLoadState("loading");
    try {
      const body = await apiRequest("/profile");
      setProfile({ ...EMPTY_PROFILE, ...body.profile });
      setLoadState("ready");
    } catch {
      setLoadState("error");
    }
  }, []);

  useEffect(() => {
    if (ready && user) loadProfile();
  }, [loadProfile, ready, user]);

  useEffect(() => {
    if (passwordState.errors.currentPassword) currentPasswordRef.current?.focus();
    else if (passwordState.errors.newPassword) newPasswordRef.current?.focus();
    else if (passwordState.errors.confirmPassword) confirmPasswordRef.current?.focus();
  }, [passwordState.errors]);

  useEffect(() => {
    if (deletionState.errors.confirmation) deletionConfirmationRef.current?.focus();
    else if (deletionState.errors.currentPassword) deletionPasswordRef.current?.focus();
  }, [deletionState.errors]);

  if (!ready) {
    return <AppShell><PageStatus label={t("profile.loading")} /></AppShell>;
  }
  if (!user) return <Navigate to="/login?returnTo=%2Fprofile" replace />;

  async function saveProfile(event) {
    event.preventDefault();
    const name = profile.name.trim();
    if (profileState.busy) return;
    if (name.length < 2 || name.length > 80) {
      setProfileState({ busy: false, message: "", error: "", errors: { name: t("profile.nameRule") } });
      nameRef.current?.focus();
      return;
    }
    setProfileState({ busy: true, message: "", error: "", errors: {} });
    try {
      const body = await apiRequest("/profile", {
        method: "PATCH",
        body: JSON.stringify({ name, preferredLanguage: profile.preferredLanguage })
      });
      setProfile({ ...profile, ...body.profile });
      setLanguage(body.profile.preferredLanguage);
      setProfileState({ busy: false, message: t("profile.saved"), error: "", errors: {} });
    } catch (error) {
      setProfileState({ busy: false, message: "", error: errorMessage(error, t), errors: {} });
    }
  }

  async function changePassword(event) {
    event.preventDefault();
    if (passwordState.busy) return;
    if (passwords.currentPassword.length < 8) {
      setPasswordState({ busy: false, message: "", error: "", errors: { currentPassword: t("profile.passwordRule") } });
      currentPasswordRef.current?.focus();
      return;
    }
    if (passwords.newPassword.length < 8 || new TextEncoder().encode(passwords.newPassword).length > 72) {
      setPasswordState({ busy: false, message: "", error: "", errors: { newPassword: t("profile.passwordRule") } });
      newPasswordRef.current?.focus();
      return;
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      setPasswordState({ busy: false, message: "", error: "", errors: { confirmPassword: t("profile.passwordMatch") } });
      confirmPasswordRef.current?.focus();
      return;
    }
    setPasswordState({ busy: true, message: "", error: "", errors: {} });
    try {
      await apiRequest("/profile/password", {
        method: "POST",
        body: JSON.stringify({ currentPassword: passwords.currentPassword, newPassword: passwords.newPassword })
      });
      setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setPasswordState({ busy: false, message: t("profile.passwordSaved"), error: "", errors: {} });
    } catch (error) {
      const message = errorMessage(error, t);
      setPasswordState({
        busy: false,
        message: "",
        error: error?.code === "CURRENT_PASSWORD_INVALID" ? "" : message,
        errors: error?.code === "CURRENT_PASSWORD_INVALID" ? { currentPassword: message } : {}
      });
      if (error?.code === "CURRENT_PASSWORD_INVALID") currentPasswordRef.current?.focus();
    }
  }

  async function deleteAccount(event) {
    event.preventDefault();
    if (deletionState.busy) return;
    if (deletion.confirmation !== "DELETE") {
      setDeletionState({ busy: false, error: "", errors: { confirmation: t("profile.deleteConfirmation") } });
      deletionConfirmationRef.current?.focus();
      return;
    }
    if (profile.accountType !== "GUEST" && deletion.currentPassword.length < 8) {
      setDeletionState({ busy: false, error: "", errors: { currentPassword: t("profile.deletionPasswordRule") } });
      deletionPasswordRef.current?.focus();
      return;
    }
    setDeletionState({ busy: true, error: "", errors: {} });
    try {
      await apiRequest("/privacy/account", {
        method: "DELETE",
        body: JSON.stringify({
          confirmation: deletion.confirmation,
          ...(profile.accountType === "GUEST" ? {} : { currentPassword: deletion.currentPassword })
        })
      });
      logout();
      navigate("/login", { replace: true, state: { reason: "account-deleted" } });
    } catch (error) {
      const message = errorMessage(error, t);
      setDeletionState({
        busy: false,
        error: error?.code === "CURRENT_PASSWORD_INVALID" ? "" : message,
        errors: error?.code === "CURRENT_PASSWORD_INVALID" ? { currentPassword: message } : {}
      });
      if (error?.code === "CURRENT_PASSWORD_INVALID") deletionPasswordRef.current?.focus();
    }
  }

  return (
    <AppShell>
      <section className="border-b border-ink/10 bg-paper px-5 py-12 sm:px-8 sm:py-16">
        <div className="mx-auto max-w-6xl">
          {loadState === "ready" && <><p className="flex items-center gap-2 text-sm font-bold text-lake"><UserRound className="h-4 w-4" /> Nuogo</p><h1 className="mt-3 font-display text-4xl font-bold sm:text-5xl">{t("profile.title")}</h1><p className="mt-3 max-w-2xl text-ink/65">{t("profile.description")}</p></>}
        </div>
      </section>
      <section className="px-5 py-8 sm:px-8 sm:py-12">
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,.72fr)]">
          {loadState === "loading" ? <PageStatus label={t("profile.loading")} /> : loadState === "error" ? (
            <LoadError label={t("profile.loadFailed")} retry={loadProfile} retryLabel={t("profile.retry")} />
          ) : (
            <>
              <form onSubmit={saveProfile} noValidate className="rounded-xl border border-ink/10 bg-white p-5 sm:p-7">
                <SectionTitle icon={UserRound} title={t("profile.account")} />
                <div className="mt-6 grid gap-5 sm:grid-cols-2">
                  <Field label={t("profile.displayName")} error={profileState.errors.name} errorId="profile-name-error">
                    <input ref={nameRef} value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} className="field-control" aria-invalid={Boolean(profileState.errors.name)} aria-describedby={profileState.errors.name ? "profile-name-error" : undefined} autoComplete="name" disabled={profileState.busy} />
                  </Field>
                  <Field label={t("profile.email")}>
                    <input value={profile.email} className="field-control bg-mist" readOnly aria-readonly="true" autoComplete="email" />
                  </Field>
                </div>
                <Field label={t("profile.language")} className="mt-5 max-w-sm">
                  <select value={profile.preferredLanguage} onChange={(event) => setProfile({ ...profile, preferredLanguage: event.target.value })} className="field-control" disabled={profileState.busy}>
                    <option value="zh">{t("profile.languageChinese")}</option>
                    <option value="en">{t("profile.languageEnglish")}</option>
                  </select>
                </Field>
                <FormNotice state={profileState} />
                <button disabled={profileState.busy} className="mt-6 flex min-h-11 items-center gap-2 rounded-lg bg-ink px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"><Save className="h-4 w-4" />{profileState.busy ? t("profile.saving") : t("profile.save")}</button>
              </form>
              <div className="grid content-start gap-6">
                {profile.accountType === "GUEST" ? (
                  <section className="rounded-xl border border-ink/10 bg-white p-5 sm:p-7"><SectionTitle icon={KeyRound} title={t("profile.guest")} /><p className="mt-4 text-sm leading-6 text-ink/65">{t("profile.guestBody")}</p></section>
                ) : (
                  <form onSubmit={changePassword} noValidate className="rounded-xl border border-ink/10 bg-white p-5 sm:p-7">
                    <SectionTitle icon={KeyRound} title={t("profile.password")} />
                    <div className="mt-5 grid gap-4"><PasswordField label={t("profile.currentPassword")} value={passwords.currentPassword} onChange={(value) => setPasswords({ ...passwords, currentPassword: value })} disabled={passwordState.busy} error={passwordState.errors.currentPassword} errorId="profile-current-password-error" inputRef={currentPasswordRef} autoComplete="current-password" /><PasswordField label={t("profile.newPassword")} value={passwords.newPassword} onChange={(value) => setPasswords({ ...passwords, newPassword: value })} disabled={passwordState.busy} error={passwordState.errors.newPassword} errorId="profile-new-password-error" inputRef={newPasswordRef} autoComplete="new-password" /><PasswordField label={t("profile.confirmPassword")} value={passwords.confirmPassword} onChange={(value) => setPasswords({ ...passwords, confirmPassword: value })} disabled={passwordState.busy} error={passwordState.errors.confirmPassword} errorId="profile-confirm-password-error" inputRef={confirmPasswordRef} autoComplete="new-password" /></div>
                    <FormNotice state={passwordState} />
                    <button disabled={passwordState.busy} className="mt-6 flex min-h-11 items-center gap-2 rounded-lg border border-ink/15 bg-white px-4 text-sm font-bold text-ink disabled:cursor-not-allowed disabled:opacity-50"><KeyRound className="h-4 w-4" />{passwordState.busy ? t("profile.changingPassword") : t("profile.changePassword")}</button>
                  </form>
                )}
                <form onSubmit={deleteAccount} noValidate className="rounded-xl border border-vermilion/30 bg-vermilion/5 p-5 sm:p-7">
                  <SectionTitle icon={ShieldAlert} title={t("profile.privacy")} tone="text-vermilion" />
                  <p className="mt-4 text-sm leading-6 text-ink/70">{t("profile.privacyBody")}</p>
                  <div className="mt-5 grid gap-4"><Field label={t("profile.confirmation")} error={deletionState.errors.confirmation} errorId="profile-delete-confirmation-error"><input ref={deletionConfirmationRef} value={deletion.confirmation} onChange={(event) => setDeletion({ ...deletion, confirmation: event.target.value })} className="field-control" aria-invalid={Boolean(deletionState.errors.confirmation)} aria-describedby={deletionState.errors.confirmation ? "profile-delete-confirmation-error" : undefined} autoComplete="off" disabled={deletionState.busy} /></Field>{profile.accountType !== "GUEST" && <PasswordField label={t("profile.deletionPassword")} value={deletion.currentPassword} onChange={(value) => setDeletion({ ...deletion, currentPassword: value })} disabled={deletionState.busy} error={deletionState.errors.currentPassword} errorId="profile-delete-password-error" inputRef={deletionPasswordRef} autoComplete="current-password" />}</div>
                  {deletionState.error && <p role="alert" className="mt-4 text-sm font-semibold text-vermilion">{deletionState.error}</p>}
                  <button disabled={deletionState.busy} className="mt-6 flex min-h-11 items-center gap-2 rounded-lg bg-vermilion px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"><Trash2 className="h-4 w-4" />{deletionState.busy ? t("profile.deleting") : t("profile.delete")}</button>
                </form>
              </div>
            </>
          )}
        </div>
      </section>
    </AppShell>
  );
}

function Field({ label, children, className = "", error, errorId }) { return <label className={`block ${className}`}><span className="mb-2 block text-sm font-bold">{label}</span>{children}{error && <span id={errorId} role="alert" className="mt-2 block text-sm font-semibold text-vermilion">{error}</span>}</label>; }
function PasswordField({ label, value, onChange, disabled, error, errorId, inputRef, autoComplete }) { return <Field label={label} error={error} errorId={errorId}><input ref={inputRef} type="password" value={value} onChange={(event) => onChange(event.target.value)} className="field-control" aria-invalid={Boolean(error)} aria-describedby={error ? errorId : undefined} autoComplete={autoComplete} disabled={disabled} /></Field>; }
function SectionTitle({ icon: Icon, title, tone = "text-lake" }) { return <h2 className="flex items-center gap-2 font-display text-2xl font-bold"><Icon className={`h-5 w-5 ${tone}`} />{title}</h2>; }
function FormNotice({ state }) { return <>{state.error && <p role="alert" className="mt-4 text-sm font-semibold text-vermilion">{state.error}</p>}{state.message && <p role="status" aria-live="polite" className="mt-4 text-sm font-semibold text-jade">{state.message}</p>}</>; }
function PageStatus({ label }) { return <div role="status" aria-live="polite" className="mx-auto grid min-h-64 max-w-6xl place-items-center text-sm font-bold text-ink/60"><span className="flex items-center gap-3"><LoaderCircle className="h-5 w-5 animate-spin text-lake" />{label}</span></div>; }
function LoadError({ label, retry, retryLabel }) { return <div className="mx-auto flex min-h-64 max-w-6xl flex-col items-center justify-center gap-4 text-center"><p role="alert" className="font-semibold text-vermilion">{label}</p><button type="button" onClick={retry} className="flex min-h-11 items-center gap-2 rounded-lg bg-ink px-4 text-sm font-bold text-white"><RefreshCw className="h-4 w-4" />{retryLabel}</button></div>; }
