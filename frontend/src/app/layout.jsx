import "./globals.css";
import Providers from "../components/Providers";

export const metadata = {
  title: "FinSight AI - Smart Finance Management",
  description: "Track your money. Understand your habits. Save smarter.",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#080d19] text-[#f8fafc]">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

