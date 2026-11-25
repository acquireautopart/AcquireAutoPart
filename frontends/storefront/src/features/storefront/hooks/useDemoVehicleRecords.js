"use client";

import { useEffect, useState } from "react";

export default function useDemoVehicleRecords(year, make, model) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!year || !make || !model) {
      setRecords([]);
      setLoading(false);
      setError("");
      return;
    }

    const controller = new AbortController();

    async function loadRecords() {
      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams({ resource: "details", year, make, model });
        const response = await fetch(`/api/vehicles?${params}`, { signal: controller.signal });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Unable to load vehicle details.");
        }
        if (!Array.isArray(data.vehicles)) {
          throw new Error("The vehicle details response is invalid.");
        }
        setRecords(data.vehicles);
      } catch (loadError) {
        if (loadError.name !== "AbortError") {
          setRecords([]);
          setError(loadError.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadRecords();
    return () => controller.abort();
  }, [year, make, model]);

  return { records, loading, error };
}