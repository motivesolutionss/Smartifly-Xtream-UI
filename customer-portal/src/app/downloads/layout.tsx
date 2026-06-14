import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Download Apps",
    description: "Download Smartifly TV and Mobile APKs for Android and Firestick. View installation instructions and check upcoming apps for iOS, Samsung, and LG Smart TV.",
    keywords: ["download", "APK", "Android TV", "Firestick", "iOS app", "Tizen", "webOS", "Smartifly TV", "setup guide"],
};

export default function DownloadsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
