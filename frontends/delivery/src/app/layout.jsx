import "./globals.css";

export const metadata = {
  title: "AcquireAuto Delivery | Deliver auto parts",
  description:
    "Delivery partner routes, barcode scans, customer verification and shipment tracking.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
