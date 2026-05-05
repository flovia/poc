import { redirect } from "next/navigation";
import { resolveRootRedirectPath } from "./root-redirect";

export default function RootRedirect() {
  redirect(resolveRootRedirectPath());
}
