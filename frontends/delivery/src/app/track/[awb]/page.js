import TrackingPage from "@/features/delivery/pages/TrackingPage";

export const metadata = { title: "Track your parcel" };

export default async function TrackPage({ params }) {
  const { awb } = await params;
  return <TrackingPage awb={awb} />;
}
