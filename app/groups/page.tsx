import { redirect } from "next/navigation";

// My Groups is a pop-up now (avatar menu → My Groups). Old links open it in Messages.
export default function Groups() {
  redirect("/inbox?groups=1");
}
