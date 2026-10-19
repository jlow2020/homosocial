import { redirect } from "next/navigation";

// The house rules grew up into the Community Guidelines.
export default function Rules() {
  redirect("/guidelines");
}
