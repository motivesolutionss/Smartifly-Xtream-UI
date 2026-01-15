import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Setup Guide",
    description: "Step-by-step guide on how to subscribe to Smartifly OTT. Learn how to select a package, verify your email, make payment, and activate your subscription.",
    keywords: ["setup", "guide", "tutorial", "subscription", "how to", "instructions"],
};

export default function GuideLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}

