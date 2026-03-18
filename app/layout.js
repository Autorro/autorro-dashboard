import "./globals.css";
import Link from "next/link";

export const metadata = { title: "Autorro Dashboard" };

export default function RootLayout({ children }) {
  return (
    <html lang="sk">
      <body className="bg-gray-100 text-gray-900">
        {children}
      </body>
    </html>
  );
}