import type { Metadata } from "next";
import { PATHS } from "@/app/_lib/paths";
import { getProfile } from "@/features/member/api";
import { requireMember } from "@/features/session/guard";
import { PageHeading } from "../_components/PageHeading/PageHeading";
import { LinkedLogins } from "./_components/LinkedLogins/LinkedLogins";
import { PasswordForm } from "./_components/PasswordForm/PasswordForm";
import { ProfileForm } from "./_components/ProfileForm/ProfileForm";
import { Withdraw } from "./_components/Withdraw/Withdraw";

export const metadata: Metadata = { title: "계정 설정" };

export default async function SettingsPage() {
  await requireMember(PATHS.mySettings);
  const { nickname, email, links } = await getProfile();
  return (
    <>
      <PageHeading title="계정 설정" />
      <ProfileForm key={email} nickname={nickname} email={email} />
      <PasswordForm />
      <LinkedLogins links={links} />
      <Withdraw />
    </>
  );
}
