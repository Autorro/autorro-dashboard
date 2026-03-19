import "./globals.css";

export const metadata = { title: "Autorro Dashboard" };

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }) {
  return (
    <html lang="sk">
      <body className="bg-gray-100 text-gray-900">
        {children}
      </body>
    </html>
  );
}