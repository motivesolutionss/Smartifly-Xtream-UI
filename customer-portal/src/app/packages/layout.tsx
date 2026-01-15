import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Pricing & Packages",
    description: "Choose from our premium IPTV streaming packages. Affordable plans with thousands of live channels, movies, and series. Start streaming today.",
    keywords: ["IPTV packages", "streaming plans", "TV subscription", "pricing"],
};

export default function PackagesLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
