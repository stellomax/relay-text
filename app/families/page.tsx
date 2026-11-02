import { redirect } from "next/navigation";

// "Families" became the Parents list (kept by admins) and each teacher's own groups.
export default function Families() {
  redirect("/inbox?groups=1");
}
