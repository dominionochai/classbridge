import "./globals.css";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "ClassBridge", description: "Accessible classroom tools" };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="en"><body>{children}</body></html>; }
