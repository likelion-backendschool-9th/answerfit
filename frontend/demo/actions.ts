"use server";

import { refresh } from "next/cache";
import { isSwitchable, saveDataMode } from "./mode";
import { isDataMode, isDemoRole } from "./rules";
import { clearDemoSession, DEMO_ADMIN, DEMO_MEMBER, writeDemoSession } from "./session";

export async function switchMode(mode: string) {
  if (!isSwitchable() || !isDataMode(mode)) return;
  await saveDataMode(mode);
  refresh();
}

export async function switchRole(role: string) {
  if (!isSwitchable() || !isDemoRole(role)) return;
  if (role === "guest") await clearDemoSession();
  else await writeDemoSession(role === "admin" ? DEMO_ADMIN : DEMO_MEMBER);
  refresh();
}
