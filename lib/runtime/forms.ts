import { $, $$, loadScript } from "./dom";

/*
 * The site's forms post to /api/form.php (public/api/form.php), which emails
 * the submission and, for newsletter sign-ups, can add the person to Klaviyo:
 * - Elementor forms: footer newsletter (every page) and /subscribe/
 * - Contact Form 7: the private feedback form on /reviews/
 * - the comment form on /about/sophia-kim/
 * Messages are the plugins' own default texts. Google reCAPTCHA v2 checkboxes
 * (same site keys as the live site) are drawn when the script starts, from the
 * reCAPTCHA script at the end of the page (components/Analytics.tsx), as on the live site.
 */

const ENDPOINT = "/api/form.php";

type G = { render: (el: Element, o: { sitekey: string; size?: string; theme?: string }) => number; getResponse: (id?: number) => string; reset: (id?: number) => void };
const grecaptcha = () => (window as unknown as { grecaptcha?: G & { ready?: (f: () => void) => void } }).grecaptcha;

let recaptchaReady: Promise<void> | null = null;
function loadRecaptcha(): Promise<void> {
  if (!recaptchaReady)
    recaptchaReady = new Promise((resolve) => {
      const g = grecaptcha();
      if (g?.ready) return g.ready(resolve);
      (window as unknown as { ksRecaptchaLoaded: () => void }).ksRecaptchaLoaded = () => resolve();
      void loadScript("https://www.google.com/recaptcha/api.js?onload=ksRecaptchaLoaded&render=explicit");
    });
  return recaptchaReady;
}

/** Renders the reCAPTCHA boxes of a form; returns a function that reads the token. */
function captcha(form: HTMLElement): () => string | null {
  const boxes = $$(".elementor-g-recaptcha, .g-recaptcha, .wpcf7-recaptcha", form).filter((b) => b.dataset.sitekey);
  if (!boxes.length) return () => null;
  const ids: number[] = [];
  void loadRecaptcha().then(() => {
    for (const b of boxes) ids.push(grecaptcha()!.render(b, { sitekey: b.dataset.sitekey!, size: b.dataset.size || "normal", theme: b.dataset.theme || "light" }));
  });
  return () => (ids.length ? grecaptcha()!.getResponse(ids[0]) : "");
}

async function post(data: FormData): Promise<boolean> {
  try {
    const res = await fetch(ENDPOINT, { method: "POST", body: data, headers: { Accept: "application/json" } });
    const json = (await res.json().catch(() => ({}))) as { ok?: boolean };
    return res.ok && !!json.ok;
  } catch {
    return false;
  }
}

const trap = () => {
  // Spam trap: real visitors never fill this in.
  const i = document.createElement("input");
  i.type = "text";
  i.name = "ks_website";
  i.tabIndex = -1;
  i.autocomplete = "off";
  i.setAttribute("aria-hidden", "true");
  Object.assign(i.style, { position: "absolute", left: "-9999px", width: "1px", height: "1px", opacity: "0" });
  return i;
};

function elementorForms() {
  for (const form of $$<HTMLFormElement>("form.elementor-form")) {
    form.appendChild(trap());
    const token = captcha(form);
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      for (const m of $$(".elementor-message", form)) m.remove();
      const t = token();
      if (t === "") {
        form.insertAdjacentHTML("beforeend", '<div class="elementor-message elementor-message-danger elementor-help-inline elementor-form-help-inline" role="alert">The Captcha field cannot be blank. Please enter a value.</div>');
        return;
      }
      form.classList.add("elementor-form-waiting");
      const data = new FormData(form);
      data.set("ks_form", "newsletter");
      data.set("ks_form_name", form.getAttribute("name") ?? "");
      data.set("ks_page", location.pathname);
      if (t) data.set("g-recaptcha-response", t);
      const ok = await post(data);
      form.classList.remove("elementor-form-waiting");
      form.insertAdjacentHTML(
        "beforeend",
        ok ? '<div class="elementor-message elementor-message-success" role="alert">Your submission was successful.</div>' : '<div class="elementor-message elementor-message-danger" role="alert">Your submission failed because of an error.</div>',
      );
      if (ok) {
        form.reset();
        // Same dataLayer event the Elementor form sends to Tag Manager.
        (window as unknown as { dataLayer?: unknown[] }).dataLayer?.push({ event: "form_submit", form_name: form.getAttribute("name") ?? "" });
      }
    });
  }
}

function cf7Forms() {
  for (const form of $$<HTMLFormElement>("form.wpcf7-form")) {
    form.appendChild(trap());
    const token = captcha(form);
    const out = $(".wpcf7-response-output", form);
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      for (const tip of $$(".wpcf7-not-valid-tip", form)) tip.remove();
      let valid = true;
      for (const f of $$<HTMLInputElement>("[aria-required='true']", form)) {
        f.classList.remove("wpcf7-not-valid");
        if (!f.value.trim()) {
          valid = false;
          f.classList.add("wpcf7-not-valid");
          f.setAttribute("aria-invalid", "true");
          f.insertAdjacentHTML("afterend", '<span class="wpcf7-not-valid-tip" aria-hidden="true">Please fill out this field.</span>');
        }
      }
      const t = token();
      const say = (msg: string, state: string) => {
        form.setAttribute("data-status", state);
        form.classList.remove("init", "invalid", "sent", "failed");
        form.classList.add(state);
        if (out) {
          out.textContent = msg;
          out.setAttribute("aria-hidden", "false");
        }
      };
      if (!valid || t === "") return say("One or more fields have an error. Please check and try again.", "invalid");
      form.classList.add("submitting");
      const data = new FormData(form);
      data.set("ks_form", "review");
      data.set("ks_page", location.pathname);
      if (t) data.set("g-recaptcha-response", t);
      const ok = await post(data);
      form.classList.remove("submitting");
      if (ok) {
        say("Thank you for your message. It has been sent.", "sent");
        form.reset();
      } else say("There was an error trying to send your message. Please try again later.", "failed");
    });
  }
}

function commentForms() {
  for (const form of $$<HTMLFormElement>("form#commentform")) {
    form.appendChild(trap());
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = new FormData(form);
      data.set("ks_form", "comment");
      data.set("ks_page", location.pathname);
      const ok = await post(data);
      const note = document.createElement("p");
      note.className = "comment-awaiting-moderation";
      note.textContent = ok ? "Your comment is awaiting moderation." : "Your comment could not be sent. Please try again later.";
      $(".ks-comment-note", form)?.remove();
      note.classList.add("ks-comment-note");
      form.prepend(note);
      if (ok) form.reset();
    });
  }
}

export function initForms() {
  elementorForms();
  cf7Forms();
  commentForms();
}
