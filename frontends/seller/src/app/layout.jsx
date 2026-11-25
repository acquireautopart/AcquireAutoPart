import "./globals.css";
import "./theme.css";
import "leaflet/dist/leaflet.css";
import { MarketProvider } from "@/features/storefront/lib/market";

export const metadata = {
  title: "Sell Auto Parts Online | AcquireAuto Seller Hub",
  description:
    "Grow your auto-parts business with AcquireAuto. List products, reach new customers, manage orders, and track payouts in one seller hub.",
};

// Runs before the first paint so the saved theme is applied without a flash.
// Default theme is "dark" – change DEFAULT_THEME here (and in ThemeToggle) to start in light.
const themeScript = `(function(){try{var t=localStorage.getItem("acquireauto-theme");var d=t!=="light";document.documentElement.setAttribute("data-theme",d?"dark":"light");document.documentElement.classList.toggle("dark",d)}catch(e){document.documentElement.setAttribute("data-theme","dark");document.documentElement.classList.add("dark")}})();`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="dark" className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <MarketProvider>{children}</MarketProvider>
      </body>
    </html>
  );
}
