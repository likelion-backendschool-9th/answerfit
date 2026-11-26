"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { checkAccountAction, signupAction } from "@/features/auth/actions";
import type { AccountErrors, ProfileErrors, SignupResult } from "@/features/auth/types";
import { hasErrors, validateAccount, validateProfile } from "@/features/auth/validation";
import { AccountStep, type AccountValues } from "../AccountStep/AccountStep";
import { DoneStep } from "../DoneStep/DoneStep";
import { ProfileStep, type ProfileValues } from "../ProfileStep/ProfileStep";
import { SignupSteps } from "../SignupSteps/SignupSteps";
import styles from "./SignupFlow.module.css";

const EMPTY_ACCOUNT: AccountValues = { email: "", password: "", passwordConfirm: "", agreements: [false, false, false] };
const EMPTY_PROFILE: ProfileValues = { nickname: "", usePhoto: false, photo: null };

/** 비밀번호를 주소나 저장소에 남기지 않으려고 세 단계를 한 주소에서 상태로 바꾼다 */
export function SignupFlow() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [account, setAccount] = useState(EMPTY_ACCOUNT);
  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [accountErrors, setAccountErrors] = useState<AccountErrors>({});
  const [profileErrors, setProfileErrors] = useState<ProfileErrors>({});
  const [error, setError] = useState<string>();
  const [doneName, setDoneName] = useState("");
  const [signedIn, setSignedIn] = useState(false);
  const [pending, startTransition] = useTransition();
  const content = useRef<HTMLDivElement>(null);
  const shownStep = useRef(step);

  // 단계가 바뀌면 새 제목으로 초점을 옮긴다
  useEffect(() => {
    if (shownStep.current === step) return;
    shownStep.current = step;
    content.current?.querySelector("h1")?.focus();
  }, [step]);

  const agreed = account.agreements.every(Boolean);
  const photo = profile.usePhoto ? profile.photo : null;

  function accountForm() {
    const form = new FormData();
    form.set("email", account.email);
    form.set("password", account.password);
    form.set("passwordConfirm", account.passwordConfirm);
    form.set("termsOfService", String(account.agreements[0] === true));
    form.set("privacyCollection", String(account.agreements[1] === true));
    form.set("interviewRecording", String(account.agreements[2] === true));
    return form;
  }

  function showFailure(result: Extract<SignupResult, { ok: false }>) {
    setError(result.error);
    setAccountErrors(result.account ?? {});
    setProfileErrors(result.profile ?? {});
    if (result.account) setStep(1);
  }

  function submitAccount() {
    const errors = validateAccount({ ...account, email: account.email.trim(), agreed });
    setAccountErrors(errors);
    setError(undefined);
    if (hasErrors(errors)) return;
    startTransition(async () => {
      const result = await checkAccountAction(accountForm());
      if (result.ok) setStep(2);
      else showFailure(result);
    });
  }

  function submitProfile() {
    const nickname = profile.nickname.trim();
    const errors = validateProfile({ nickname, photo });
    if (profile.usePhoto && !photo) errors.photo = "사진을 골라 주세요.";
    setProfileErrors(errors);
    setError(undefined);
    if (hasErrors(errors)) return;
    startTransition(async () => {
      const form = accountForm();
      form.set("nickname", nickname);
      if (photo) form.set("photo", photo);
      const result = await signupAction(form);
      if (!result.ok) return showFailure(result);
      // 화면을 떠나도 상태가 남을 수 있어 비밀번호를 바로 지운다
      setAccount(EMPTY_ACCOUNT);
      setProfile(EMPTY_PROFILE);
      setDoneName(nickname);
      setSignedIn(result.signedIn === true);
      setStep(3);
    });
  }

  function goBack() {
    setError(undefined);
    setStep(1);
  }

  return (
    <div className={styles.flow} ref={content}>
      <SignupSteps step={step} />
      {step === 1 && <AccountStep values={account} errors={accountErrors} error={error} pending={pending} onChange={setAccount} onSubmit={submitAccount} />}
      {step === 2 && (
        <ProfileStep values={profile} errors={profileErrors} error={error} pending={pending} onChange={setProfile} onBack={goBack} onSubmit={submitProfile} />
      )}
      {step === 3 && <DoneStep nickname={doneName} signedIn={signedIn} />}
    </div>
  );
}
