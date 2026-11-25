"use client";

import { useState } from "react";
import {
  Headset,
  Phone,
  Mail,
  MessagesSquare,
  MessageCircle,
  Send,
  Clock3,
  ChevronDown,
  LifeBuoy,
} from "lucide-react";
import { demoContactChannels, demoFaqs } from "@/features/storefront/data/profileDemo";
import { profileApi } from "@/features/storefront/lib/profileApi";
import ProfileSubpageFrame from "@/features/profile/components/ProfileSubpageFrame";
import {
  useProfileResource,
  ProfileModal,
  Field,
  PROFILE_INPUT,
  PROFILE_LABEL,
  PROFILE_BTN_PRIMARY,
  PROFILE_BTN_GHOST,
} from "@/features/profile/components/ProfileFormKit";
import { SectionNotice, useSectionNotice } from "@/features/profile/components/SectionNotice";

const ICONS = {
  phone: Phone,
  mail: Mail,
  chat: MessagesSquare,
  whatsapp: MessageCircle,
};

const SUBJECTS = [
  "Order or delivery",
  "Return or refund",
  "Fitment help",
  "Payment issue",
  "Account & KYC",
  "Something else",
];

const TICKET_STATUS_STYLE = {
  Open: "bg-[var(--pf-info-bg)] text-[var(--pf-info)]",
  "In progress": "bg-[var(--pf-warn-bg)] text-[var(--pf-warn)]",
  Resolved: "bg-[var(--pf-ok-bg)] text-[var(--pf-ok)]",
};
const STATUS_FALLBACK = "bg-[var(--pf-card-2)] text-[var(--pf-muted)]";

const TEXTAREA =
  "w-full rounded-lg border border-[var(--pf-border)] bg-[var(--pf-input)] p-3 text-sm text-[var(--pf-text)] outline-none placeholder:text-[var(--pf-muted)] focus:border-[var(--pf-brand)]";

const EMPTY_FORM = { subject: SUBJECTS[0], orderId: "", message: "" };

export default function ContactPageClient() {
  const [notice, setNotice] = useSectionNotice();
  const [form, setForm] = useState(EMPTY_FORM);
  const [sending, setSending] = useState(false);

  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [chatError, setChatError] = useState("");
  const [chatSending, setChatSending] = useState(false);

  const {
    data: ticketsData,
    loading: ticketsLoading,
    error: ticketsError,
    reload: reloadTickets,
  } = useProfileResource(() => profileApi.tickets(), []);

  const tickets = ticketsData?.tickets ?? [];

  async function submit(event) {
    event.preventDefault();
    const message = form.message.trim();
    if (message.length < 10 || message.length > 2000) {
      setNotice("Please write a message between 10 and 2000 characters");
      return;
    }

    setSending(true);
    try {
      const { ticket } = await profileApi.createTicket({
        subject: form.subject,
        orderRef: form.orderId.trim() || undefined,
        message,
      });
      setForm(EMPTY_FORM);
      await reloadTickets();
      setNotice(`Request ${ticket?.reference ?? ""} sent – we reply within 24 hours`);
    } catch (error) {
      setNotice(error.message);
    } finally {
      setSending(false);
    }
  }

  async function submitChat(event) {
    event.preventDefault();
    const message = chatMessage.trim();
    if (message.length < 10 || message.length > 2000) {
      setChatError("Write between 10 and 2000 characters.");
      return;
    }

    setChatSending(true);
    setChatError("");
    try {
      const { ticket } = await profileApi.createTicket({ subject: "Live chat", message });
      setChatOpen(false);
      setChatMessage("");
      await reloadTickets();
      setNotice(`Chat request ${ticket?.reference ?? ""} started – an agent will reply shortly`);
    } catch (error) {
      setChatError(error.message);
    } finally {
      setChatSending(false);
    }
  }

  return (
    <ProfileSubpageFrame activeId="contact">
      <header className="min-w-0">
        <h1 className="flex items-center gap-2.5 font-display text-2xl font-extrabold sm:text-3xl">
          <Headset size={24} className="shrink-0 text-[var(--pf-brand)]" strokeWidth={2} />
          Contact Us
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm text-[var(--pf-text-2)]">
          Questions about a part, an order or your account? Our team is here to help.
        </p>
      </header>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {demoContactChannels.map((channel) => {
          const Icon = ICONS[channel.icon] || LifeBuoy;
          const inner = (
            <>
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-[var(--pf-brand-soft)] text-[var(--pf-brand)]">
                <Icon size={19} strokeWidth={2} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] font-bold uppercase tracking-wide text-[var(--pf-muted)]">
                  {channel.label}
                </span>
                <span className="mt-0.5 block truncate text-sm font-bold text-[var(--pf-text)]">
                  {channel.value}
                </span>
                <span className="mt-0.5 block text-[11px] text-[var(--pf-muted)]">
                  {channel.detail}
                </span>
              </span>
            </>
          );

          const className =
            "pf-card flex items-center gap-3 p-4 text-left transition-colors hover:border-[var(--pf-brand)]";

          return channel.href ? (
            <a key={channel.id} href={channel.href} className={className}>
              {inner}
            </a>
          ) : (
            <button
              key={channel.id}
              type="button"
              onClick={() => {
                setChatMessage("");
                setChatError("");
                setChatOpen(true);
              }}
              className={className}
            >
              {inner}
            </button>
          );
        })}
      </div>

      <div className="pf-card mt-4 flex items-center gap-3 p-4">
        <Clock3 size={18} className="shrink-0 text-[var(--pf-brand)]" />
        <p className="min-w-0 text-xs text-[var(--pf-text-2)]">
          Support hours: Monday to Saturday, 9:00am – 7:00pm. Average first reply within 4 hours.
        </p>
      </div>

      <section className="pf-card mt-4 p-4 sm:p-5">
        <div className="flex items-center gap-2.5">
          <Send size={18} className="shrink-0 text-[var(--pf-brand)]" />
          <h2 className="font-display text-base font-extrabold">Send us a message</h2>
        </div>

        <form onSubmit={submit} className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className={PROFILE_LABEL} htmlFor="contact-subject">
              What is this about?
            </label>
            <select
              id="contact-subject"
              value={form.subject}
              onChange={(event) =>
                setForm((current) => ({ ...current, subject: event.target.value }))
              }
              className={PROFILE_INPUT}
            >
              {SUBJECTS.map((subject) => (
                <option key={subject} value={subject}>
                  {subject}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={PROFILE_LABEL} htmlFor="contact-order">
              Order ID <span className="font-normal text-[var(--pf-muted)]">(optional)</span>
            </label>
            <input
              id="contact-order"
              value={form.orderId}
              onChange={(event) =>
                setForm((current) => ({ ...current, orderId: event.target.value }))
              }
              className={PROFILE_INPUT}
              placeholder="#AP1005"
            />
          </div>
          <div className="sm:col-span-2">
            <label className={PROFILE_LABEL} htmlFor="contact-message">
              How can we help?
            </label>
            <textarea
              id="contact-message"
              rows={4}
              value={form.message}
              onChange={(event) =>
                setForm((current) => ({ ...current, message: event.target.value }))
              }
              className={TEXTAREA}
              placeholder="Tell us what happened, and include your vehicle details if it is a fitment question."
            />
          </div>
          <div className="sm:col-span-2">
            <button type="submit" disabled={sending} className={PROFILE_BTN_PRIMARY}>
              <Send size={16} /> {sending ? "Sending…" : "Send message"}
            </button>
          </div>
        </form>
      </section>

      <section className="pf-card mt-4 p-4 sm:p-5">
        <div className="flex items-center gap-2.5">
          <Clock3 size={18} className="shrink-0 text-[var(--pf-brand)]" />
          <h2 className="font-display text-base font-extrabold">Your recent requests</h2>
        </div>

        {ticketsLoading ? (
          <p className="mt-3 text-sm text-[var(--pf-text-2)]">Loading your requests…</p>
        ) : ticketsError ? (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <p className="min-w-0 flex-1 text-sm text-[var(--pf-text-2)]">{ticketsError.message}</p>
            <button
              type="button"
              onClick={() => reloadTickets()}
              className={`${PROFILE_BTN_GHOST} min-h-9`}
            >
              Try again
            </button>
          </div>
        ) : tickets.length ? (
          <ul className="mt-2 divide-y divide-[var(--pf-border)]">
            {tickets.map((ticket) => (
              <li
                key={ticket.id}
                className="flex flex-wrap items-center justify-between gap-2 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{ticket.subject}</p>
                  <p className="mt-0.5 text-[11px] text-[var(--pf-muted)]">
                    {ticket.reference}
                    {ticket.orderRef ? ` · ${ticket.orderRef}` : ""} · {ticket.createdAt}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                    TICKET_STATUS_STYLE[ticket.status] || STATUS_FALLBACK
                  }`}
                >
                  {ticket.status}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-[var(--pf-text-2)]">
            No support requests yet. Send us a message above and our team will help you out.
          </p>
        )}
      </section>

      <h2 className="mt-5 font-display text-lg font-extrabold">Quick answers</h2>

      <div className="pf-card mt-3 divide-y divide-[var(--pf-border)] overflow-hidden">
        {demoFaqs.map((faq) => (
          <details key={faq.q} className="group">
            <summary className="flex cursor-pointer list-none items-center gap-3 p-4 text-sm font-bold [&::-webkit-details-marker]:hidden">
              <span className="min-w-0 flex-1">{faq.q}</span>
              <ChevronDown
                size={17}
                className="shrink-0 text-[var(--pf-muted)] transition-transform group-open:rotate-180"
              />
            </summary>
            <p className="px-4 pb-4 text-xs leading-5 text-[var(--pf-text-2)]">{faq.a}</p>
          </details>
        ))}
      </div>

      <div className="pf-card mt-4 flex items-start gap-3 p-4">
        <LifeBuoy size={18} className="mt-0.5 shrink-0 text-[var(--pf-brand)]" />
        <p className="min-w-0 text-xs leading-5 text-[var(--pf-text-2)]">
          AcquireAuto Parts · 24 Garage Road, Industrial Area, New Delhi 110001 ·
          support@acquireautopart.com
        </p>
      </div>

      {chatOpen && (
        <ProfileModal
          title="Start a live chat"
          description="Send us a short message and an agent will pick it up."
          onClose={() => setChatOpen(false)}
        >
          <form onSubmit={submitChat} className="grid gap-4">
            <Field label="How can we help?">
              <textarea
                rows={4}
                className={TEXTAREA}
                value={chatMessage}
                onChange={(event) => setChatMessage(event.target.value)}
                placeholder="Describe your question and we will reply shortly."
              />
            </Field>

            {chatError && (
              <p className="text-xs font-semibold text-[var(--pf-warn)]" role="alert">
                {chatError}
              </p>
            )}

            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setChatOpen(false)}
                className={PROFILE_BTN_GHOST}
              >
                Cancel
              </button>
              <button type="submit" disabled={chatSending} className={PROFILE_BTN_PRIMARY}>
                {chatSending ? "Starting…" : "Start chat"}
              </button>
            </div>
          </form>
        </ProfileModal>
      )}

      <SectionNotice message={notice} />
    </ProfileSubpageFrame>
  );
}
