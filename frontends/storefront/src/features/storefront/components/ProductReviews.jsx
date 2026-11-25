"use client";

import { useCallback, useEffect, useState } from "react";
import { Star } from "lucide-react";
import {
  authApiBase,
  requestCurrentCustomer,
  requestCustomerAuthDialog,
  SESSION_EVENT,
} from "@/lib/authApi";
import { useMarket } from "@/features/storefront/lib/market";

function stars(value) {
  return Array.from({ length: 5 }, (_, index) => (
    <Star
      key={index}
      aria-hidden="true"
      className={index < Math.round(value) ? "fill-amber-400 text-amber-400" : "text-gray-300"}
      size={16}
    />
  ));
}

async function readResponse(response, fallback) {
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(data?.message || fallback);
    error.status = response.status;
    throw error;
  }
  return data;
}

export default function ProductReviews({ productId, productImage, productName }) {
  const { country } = useMarket();
  const [summary, setSummary] = useState({ ratingAverage: 0, ratingCount: 0, reviews: [] });
  const [customer, setCustomer] = useState(null);
  const [eligibility, setEligibility] = useState(null);
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [sessionVersion, setSessionVersion] = useState(0);

  const refreshReviews = useCallback(
    async (signal) => {
      const params = new URLSearchParams({ country });
      const response = await fetch(
        `${authApiBase}/catalog/products/${encodeURIComponent(productId)}/reviews?${params}`,
        { cache: "no-store", signal },
      );
      setSummary(await readResponse(response, "Unable to load product reviews."));
    },
    [country, productId],
  );

  useEffect(() => {
    function handleSessionChange() {
      setSessionVersion((current) => current + 1);
    }

    window.addEventListener(SESSION_EVENT, handleSessionChange);
    return () => window.removeEventListener(SESSION_EVENT, handleSessionChange);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError("");
      try {
        await refreshReviews(controller.signal);
        const session = await requestCurrentCustomer({ signal: controller.signal }).catch(
          (sessionError) => {
            if (sessionError.status === 401) return null;
            throw sessionError;
          },
        );
        if (controller.signal.aborted) return;
        const signedInCustomer = session?.customer || null;
        setCustomer(signedInCustomer);
        if (signedInCustomer) {
          const params = new URLSearchParams({ country });
          const response = await fetch(
            `${authApiBase}/catalog/products/${encodeURIComponent(productId)}/reviews/eligibility?${params}`,
            { credentials: "include", cache: "no-store", signal: controller.signal },
          );
          const data = await readResponse(response, "Unable to check review eligibility.");
          if (controller.signal.aborted) return;
          setEligibility(data);
          if (data.review) {
            setRating(data.review.rating);
            setTitle(data.review.title || "");
            setComment(data.review.comment || "");
          }
        } else {
          setEligibility(null);
        }
      } catch (loadError) {
        if (loadError.name !== "AbortError") setError(loadError.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    load();
    return () => controller.abort();
  }, [country, productId, refreshReviews, sessionVersion]);

  async function submitReview(event) {
    event.preventDefault();
    if (!customer) {
      requestCustomerAuthDialog();
      return;
    }
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      const params = new URLSearchParams({ country });
      const response = await fetch(
        `${authApiBase}/catalog/products/${encodeURIComponent(productId)}/reviews?${params}`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rating, title, comment }),
        },
      );
      const data = await readResponse(response, "Unable to save your review.");
      setSuccess("Your verified-purchase review has been saved.");
      setEligibility((current) => ({ ...current, review: data.review }));
      refreshReviews().catch((refreshError) => setError(refreshError.message));
    } catch (submitError) {
      if (submitError.status === 401) {
        requestCustomerAuthDialog();
      } else {
        setError(submitError.message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mt-10 border-t border-[#ececea] pt-6" aria-labelledby="reviews-heading">
      <h2 className="text-lg font-bold text-[#20221f]" id="reviews-heading">
        Customer ratings and reviews
      </h2>
      <div className="mt-3 flex items-center gap-2">
        <span
          className="flex items-center gap-0.5"
          aria-label={`${summary.ratingAverage} out of 5 stars`}
        >
          {stars(summary.ratingAverage)}
        </span>
        <strong className="text-sm text-[#20221f]">
          {summary.ratingCount ? summary.ratingAverage.toFixed(1) : "No ratings yet"}
        </strong>
        {summary.ratingCount > 0 && (
          <span className="text-xs text-[#686b65]">
            ({summary.ratingCount} verified {summary.ratingCount === 1 ? "review" : "reviews"})
          </span>
        )}
      </div>

      {loading && (
        <p className="mt-4 text-sm text-[#686b65]" role="status">
          Loading customer reviews…
        </p>
      )}
      {!loading && summary.reviews.length === 0 && (
        <p className="mt-4 text-sm text-[#686b65]">No verified-purchase reviews yet.</p>
      )}
      <div className="mt-4 space-y-4">
        {summary.reviews.map((review) => (
          <article className="flex gap-3 border-t border-[#ececea] pt-4" key={review.id}>
            {productImage && <img src={productImage} alt={productName || "Reviewed product"} className="h-16 w-16 shrink-0 rounded-md border border-[#ececea] bg-white object-contain p-1" />}
            <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="flex items-center gap-0.5"
                aria-label={`${review.rating} out of 5 stars`}
              >
                {stars(review.rating)}
              </span>
              <strong className="text-sm text-[#20221f]">
                {review.title || `${review.rating} star${review.rating === 1 ? "" : "s"}`}
              </strong>
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-[#686b65]">
              <span>{review.reviewer}</span><span className="rounded bg-emerald-50 px-1.5 py-0.5 font-semibold text-emerald-700">Verified purchase</span><span>· {new Date(review.createdAt).toLocaleDateString()}</span>
            </p>
            {review.comment && (
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#464942]">
                {review.comment}
              </p>
            )}
            </div>
          </article>
        ))}
      </div>

      {!loading && !customer && (
        <button
          className="mt-5 text-sm font-semibold text-[#e9562e] hover:underline"
          onClick={requestCustomerAuthDialog}
          type="button"
        >
          Sign in to write a verified-purchase review
        </button>
      )}
      {!loading && customer && eligibility?.canReview && (
        <form className="mt-6 border-t border-[#ececea] pt-5" onSubmit={submitReview}>
          <h3 className="text-sm font-bold text-[#20221f]">
            {eligibility.review ? "Update your rating" : "Rate this product"}
          </h3>
          <div className="mt-2 flex gap-1" role="group" aria-label="Choose a product rating">
            {Array.from({ length: 5 }, (_, index) => {
              const value = index + 1;
              return (
                <button
                  aria-label={`${value} star${value === 1 ? "" : "s"}`}
                  aria-pressed={rating === value}
                  className="rounded p-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#e9562e]"
                  key={value}
                  onClick={() => setRating(value)}
                  type="button"
                >
                  <Star
                    className={value <= rating ? "fill-amber-400 text-amber-400" : "text-gray-300"}
                    size={22}
                  />
                </button>
              );
            })}
          </div>
          <label className="mt-3 block text-xs font-semibold text-[#464942]">
            Title (optional)
            <input
              className="mt-1.5 min-h-10 w-full rounded border border-[#d5d9d9] px-3 text-sm"
              maxLength={100}
              onChange={(event) => setTitle(event.target.value)}
              value={title}
            />
          </label>
          <label className="mt-3 block text-xs font-semibold text-[#464942]">
            Review (optional)
            <textarea
              className="mt-1.5 min-h-24 w-full rounded border border-[#d5d9d9] p-3 text-sm"
              maxLength={2000}
              onChange={(event) => setComment(event.target.value)}
              value={comment}
            />
          </label>
          <button
            className="mt-4 rounded bg-[#171916] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#e9562e] disabled:opacity-60"
            disabled={submitting || rating < 1}
            type="submit"
          >
            {submitting ? "Saving…" : eligibility.review ? "Update review" : "Submit review"}
          </button>
        </form>
      )}
      {!loading && customer && eligibility && !eligibility.canReview && (
        <p className="mt-5 text-xs text-[#686b65]">
          Reviews are available after this product has been delivered to you.
        </p>
      )}
      {error && (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="mt-3 text-sm text-emerald-700" role="status">
          {success}
        </p>
      )}
    </section>
  );
}
