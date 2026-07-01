import { headers } from "next/headers";
import BillingClient from "./BillingClient";

export default async function BillingPage() {
  const nonce = (await headers()).get("x-nonce") || undefined;
  return <BillingClient nonce={nonce} />;
}
