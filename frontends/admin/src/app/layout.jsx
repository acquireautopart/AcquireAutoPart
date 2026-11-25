import "./globals.css";
import "./theme.css";
import "leaflet/dist/leaflet.css";

export const metadata = {
  title: "Admin.AcquireautoParts | Parts that keep you moving",
  description: "Shop quality replacement auto parts, lighting, brakes, body parts, and more.",
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
        {children}
      </body>
    </html>
  );
}
