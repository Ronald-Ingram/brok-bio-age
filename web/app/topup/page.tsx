import { redirect } from "next/navigation";

/** Short link: /topup → Genius Wallet buy section */
export default function TopupRedirectPage() {
  redirect("/genius-wallet?topup=1");
}