"use client";

import { useState } from "react";
import Link from "next/link";
import { Instagram, Facebook, Youtube, Music2, Linkedin, Apple, Play, Plus } from "lucide-react";

const linkGroups = [
  {
    title: "Shop",
    links: [
      "All Makes",
      "All Parts",
      "All Brands",
      "Shop JC Whitney Performance",
      "Shop CarParts Euro",
      "View Parts on Your Vehicle",
      "Deals",
    ],
  },
  {
    title: "Life at CarParts",
    links: ["Our Story", "Careers", "Press Releases", "Investor Relations"],
  },
  {
    title: "Help",
    links: [
      "Help Center",
      "Track Order",
      "Start A Return",
      "Retrieve Your Cart",
      "Price Match Guarantee",
    ],
  },
  {
    title: "Blog",
    links: [
      "In the Garage Home",
      "Auto Repair 101",
      "DIY Guides",
      "OBD-II Trouble Codes",
      "Automotive Features",
    ],
  },
  {
    title: "Contact Us",
    links: ["1-866-529-0412", "Email Us", "Live Chat", "Website Feedback"],
  },
];

const policyLinks = [
  "Shipping Policy",
  "Warranty Policy",
  "Return Policy",
  "Privacy Policy",
  "Terms and Conditions",
  "California Supply Chain Disclosure",
  "Accessibility Statement",
  "Cookie Preferences",
  "Your Privacy Choices",
];

const socialLinks = [
  { icon: Instagram, label: "Instagram" },
  { icon: Facebook, label: "Facebook" },
  { icon: Music2, label: "TikTok" },
  { icon: Linkedin, label: "LinkedIn" },
  { icon: Youtube, label: "YouTube" },
];

export default function SiteFooter() {
  const [openAccordion, setOpenAccordion] = useState(null);

  function handleSignup(event) {
    event.preventDefault();
    event.currentTarget.reset();
    alert("Thanks! Newsletter signup is a demo and is not connected to a mailing service.");
  }

  function toggleAccordion(title) {
    setOpenAccordion((current) => (current === title ? null : title));
  }

  return (
    <footer className="bg-ink text-white">
      {/* Email Deals bar */}
      <div className="bg-soft">
        <div className="site-container flex flex-col gap-4 py-5 md:flex-row md:items-center md:justify-between md:py-6">
          <div className="text-center md:text-left">
            <span className="font-display text-[10px] font-extrabold md:text-xl">
              Email Deals{" "}
              <span className="font-normal text-white/70">
                // Be the first to receive exclusive promotions, updates and product announcements.
                Subscribe to our mailing list now!
              </span>
            </span>
          </div>
          <form
            className="flex w-full max-w-[420px] shrink-0 overflow-hidden md:w-auto"
            onSubmit={handleSignup}
          >
            <input
              className="min-w-0 flex-1 rounded-l bg-paper px-4 py-3 text-sm text-white outline-none placeholder:text-muted"
              type="email"
              placeholder="Enter your email address"
              aria-label="Email address"
              required
            />
            <button
              type="submit"
              className="shrink-0 bg-brand px-6 text-sm font-extrabold text-white transition-colors hover:bg-brand-dark"
            >
              Sign Up
            </button>
          </form>
        </div>
      </div>

      {/* Logo + Social row */}
      <div className="site-container pt-8">
        <div className="flex flex-col items-center gap-5 sm:flex-row sm:justify-between">
          <Link href="/" aria-label="CarParts home" className="shrink-0">
            <span className="font-display text-[26px] font-extrabold leading-none tracking-tight md:text-[30px]">
              <span className="text-white">Acquireauto</span>
              <span className="text-brand">Part</span>
            </span>
          </Link>
          <div className="hidden items-center gap-3 sm:flex">
            {socialLinks.map(({ icon: Icon, label }) => (
              <a
                key={label}
                href="#social"
                aria-label={label}
                className="grid h-9 w-9 place-items-center rounded-full border border-white/30 text-white transition-colors hover:border-white hover:bg-white/10"
              >
                <Icon size={18} />
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Link sections: accordions on mobile, columns on desktop */}
      <div className="site-container py-8 lg:py-10">
        {/* Mobile accordions */}
        <div className="lg:hidden">
          {linkGroups.map((group) => {
            const isOpen = openAccordion === group.title;
            return (
              <div key={group.title} className="border-b border-white/15">
                <button
                  className="flex w-full items-center justify-between py-4 text-left"
                  onClick={() => toggleAccordion(group.title)}
                  aria-expanded={isOpen}
                >
                  <h3 className="text-[15px] font-extrabold uppercase tracking-wide text-white">
                    {group.title}
                  </h3>
                  <Plus
                    size={22}
                    className={`shrink-0 text-white transition-transform duration-200 ${
                      isOpen ? "rotate-45" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <ul className="flex flex-col gap-3 pb-4">
                    {group.links.map((link) => (
                      <li key={link}>
                        <a
                          href="#"
                          className="text-[13px] text-white/80 transition-colors hover:text-brand"
                        >
                          {link}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>

        {/* Desktop columns */}
        <div className="hidden grid-cols-5 gap-6 lg:grid">
          {linkGroups.map((group) => (
            <div key={group.title}>
              <h3 className="mb-4 text-[13px] font-extrabold uppercase tracking-wide text-white">
                {group.title}
              </h3>
              <ul className="space-y-3">
                {group.links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-[13px] text-white/80 transition-colors hover:text-brand"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Social icons (mobile only) */}
      <div className="site-container flex justify-center gap-3 pb-6 sm:hidden">
        {socialLinks.map(({ icon: Icon, label }) => (
          <a
            key={label}
            href="#social"
            aria-label={label}
            className="grid h-10 w-10 place-items-center rounded-full border border-white/30 text-white transition-colors hover:border-white hover:bg-white/10"
          >
            <Icon size={20} />
          </a>
        ))}
      </div>

      {/* App badges */}
      <div className="site-container flex flex-wrap items-center justify-center gap-3 pb-6">
        <a
          href="#app"
          aria-label="Download on the App Store"
          className="flex items-center gap-2 rounded border border-white/30 px-3 py-1.5 text-white hover:bg-white/10"
        >
          <Apple size={18} />
          <span className="text-[10px] leading-tight">
            <span className="block text-[9px] opacity-80">Download on the</span>
            <span className="block font-semibold">App Store</span>
          </span>
        </a>
        <a
          href="#app"
          aria-label="Get it on Google Play"
          className="flex items-center gap-2 rounded border border-white/30 px-3 py-1.5 text-white hover:bg-white/10"
        >
          <Play size={16} fill="currentColor" />
          <span className="text-[10px] leading-tight">
            <span className="block text-[9px] opacity-80">GET IT ON</span>
            <span className="block font-semibold">Google Play</span>
          </span>
        </a>
      </div>

      {/* Bottom policy + copyright */}
      <div className="border-t border-white/15">
        <div className="site-container py-6">
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-center text-[12px]">
            {policyLinks.map((link) => (
              <a key={link} href="#" className="text-white/70 transition-colors hover:text-brand">
                {link}
              </a>
            ))}
          </div>
          <div className="mt-5 flex flex-col items-center gap-3 text-center text-[12px] text-white/70 sm:flex-row sm:justify-between sm:text-left">
            <a href="#" className="transition-colors hover:text-brand">
              Do Not Sell Or Share My Personal Information
            </a>
            <span>
              Copyright ©{new Date().getFullYear()} AcquireautoPart, Inc. All Rights Reserved.
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
