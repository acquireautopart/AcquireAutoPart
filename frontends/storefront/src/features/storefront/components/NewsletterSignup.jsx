"use client";

import { ArrowUpRight } from "lucide-react";

export default function NewsletterSignup() {
  function handleSubmit(event) {
    event.preventDefault();
    event.currentTarget.reset();
    alert("Thanks! Newsletter signup is a demo and is not connected to a mailing service.");
  }

  return (
    <form className="mt-4 flex border border-line-light bg-white" onSubmit={handleSubmit}>
      <input
        className="min-w-0 flex-1 px-3 py-3 text-xs text-[#171916] outline-none placeholder:text-muted/80"
        type="email"
        placeholder="Your email address"
        aria-label="Email address"
        required
      />
      <button
        className="grid w-11 shrink-0 place-items-center bg-brand text-white hover:bg-brand-dark"
        aria-label="Subscribe"
      >
        <ArrowUpRight size={18} />
      </button>
    </form>
  );
}
