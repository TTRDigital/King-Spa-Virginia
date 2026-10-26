import { $, $$ } from "./dom";

/*
 * The site's forms post to /api/form.php (public/api/form.php), which emails
 * the submission and, for newsletter sign-ups, can add the person to Klaviyo:
 * - Elementor forms: footer newsletter (every page) and /subscribe/
 * - Contact Form 7: the private feedback form on /reviews/
 * - the comment form on /about/sophia-kim/
 * Messages are the plugins' own default texts. Google reCAPTCHA v2 checkboxes
 * (same site keys as the live site) load as on the live site (see captcha()).
 */

const ENDPOINT = "/api/form.php";

type G = { render: (el: Element, o: Record<string, string>) => number; reset: (id?: number) => void };
const grecaptcha = () => (window as unknown as { grecaptcha?: Partial<G> }).grecaptcha;

/**
 * The form's reCAPTCHA checkbox; returns a function that reads its token ("" when not ticked, null
 * when the form has none). Elementor's box: Elementor Pro's handler, which checks every 350 ms for
 * the API and then renders the box with its data-* settings. Contact Form 7's box is rendered by the
 * plugin's own script (wpcf7-recaptcha-controls.js).
 */
function captcha(form: HTMLFormElement): () => string | null {
  const elementor = $$(".elementor-g-recaptcha", form).pop();
  const box = elementor ?? $(".wpcf7-recaptcha", form);
  if (!box) return () => null;
  if (elementor) {
    const render = () => {
      const g = grecaptcha();
      if (!g?.render) return void setTimeout(render, 350);
      const id = g.render(elementor, { ...elementor.dataset } as Record<string, string>);
      form.addEventListener("reset", () => g.reset!(id));
    };
    render();
  }
  return () => $<HTMLTextAreaElement>('[name="g-recaptcha-response"]', box)?.value ?? "";
}

// Spam check without a hidden field: how long the page was open before sending (bots post at once).
const opened = Date.now();

async function post(data: FormData): Promise<boolean> {
  data.set("ks_t", String(Date.now() - opened));
  try {
    const res = await fetch(ENDPOINT, { method: "POST", body: data, headers: { Accept: "application/json" } });
    const json = (await res.json().catch(() => ({}))) as { ok?: boolean };
    return res.ok && !!json.ok;
  } catch {
    return false;
  }
}

function elementorForms() {
  for (const form of $$<HTMLFormElement>("form.elementor-form")) {
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
