import "./globals.css";

export const metadata = {
  title: "Expense Tracker Dashboard",
  description: "Next.js + Firebase + Charts demo",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div className="container">{children}</div>
      </body>
    </html>
  );
}
