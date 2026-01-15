import { Metadata } from "next";

export const metadata: Metadata = {
    title: "About Us",
    description: "Learn about Smartifly OTT - our mission, values, and journey to deliver the world's best IPTV streaming experience.",
    keywords: ["about", "company", "mission", "values", "story"],
};

export default function AboutLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}

