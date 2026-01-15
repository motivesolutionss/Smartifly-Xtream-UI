import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Check Subscription Status",
  description: "Check the status of your IPTV subscription request. Enter your email to view approval status and package details.",
  keywords: ["subscription status", "IPTV subscription", "check order"],
};

export default function SubscriptionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}


