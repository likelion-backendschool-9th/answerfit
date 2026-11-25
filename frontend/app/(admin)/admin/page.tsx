import { redirect } from "next/navigation";
import { PATHS } from "@/app/_lib/paths";

export default function AdminPage() {
  redirect(PATHS.adminQuestions);
}
