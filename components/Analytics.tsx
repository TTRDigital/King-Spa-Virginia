/*
 * The live site's third-party scripts, word for word and in the same places:
 * - in <head>: AddToAny, Meta Pixel, the gtag for UA-210625545-1, Google Tag
 *   Manager and Hotjar
 * - first thing in <body>: Clixtell, Ahrefs Analytics, Tag Manager's
 *   <noscript>, Klaviyo and its identify call
 * - at the end of <body>: the Klaviyo plugin's scripts and Google reCAPTCHA
 *   (the newsletter form's checkbox)
 * They load straight away, as on the live site. Each block is a <template>
 * that scripts/strip-next-runtime.mjs unwraps after the build (the head block
 * goes into <head>), so in `next dev` they stay inert.
 * NEXT_PUBLIC_DISABLE_TAGS=1 switches the tracking tags off (local testing);
 * reCAPTCHA always loads.
 */
const IDS = {
  gtm: process.env.NEXT_PUBLIC_GTM_ID || "GTM-KS6SM3Q",
  ua: process.env.NEXT_PUBLIC_GA_ID || "UA-210625545-1",
};
const tagsOff = process.env.NEXT_PUBLIC_DISABLE_TAGS === "1";

const ADDTOANY = `<script id="addtoany-core-js-before">
window.a2a_config=window.a2a_config||{};a2a_config.callbacks=[];a2a_config.overlays=[];a2a_config.templates={};
a2a_config.icon_color="transparent,#00aaff";
</script>
<script id="addtoany-core-js" defer src="https://static.addtoany.com/menu/page.js"></script>`;

const HEAD = `<!-- Facebook Pixel Code -->
<script>
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '739402377460902');
fbq('track', 'PageView');
</script>
<noscript><img height="1" width="1" style="display:none"
src="https://www.facebook.com/tr?id=739402377460902&ev=PageView&noscript=1"
/></noscript>
<!-- End Facebook Pixel Code -->
<!-- Global site tag (gtag.js) - Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${IDS.ua}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', '${IDS.ua}');
</script>
<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${IDS.gtm}');</script>
<!-- End Google Tag Manager -->
<!-- Hotjar Tracking Code for https://virginia.kingspa.com/ -->
<script>
    (function(h,o,t,j,a,r){
        h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};
        h._hjSettings={hjid:2992606,hjsv:6};
        a=o.getElementsByTagName('head')[0];
        r=o.createElement('script');r.async=1;
        r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;
        a.appendChild(r);
    })(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');
</script>`;

const BODY = `<!-- Clixtell Tracking Code -->
<script type='text/javascript'>
var script=document.createElement('script');
var prefix=document.location.protocol;
script.async=true;script.type='text/javascript';
var target=prefix + '//scripts.clixtell.com/track.js';
script.src=target;var elem=document.head;
elem.appendChild(script);
</script>
<noscript><img src='//tracker.clixtell.com/track/t.gif'></noscript>
<script src="https://analytics.ahrefs.com/analytics.js" data-key="qCLRaxZsrrhdGCTNAO5eSA" async></script>
<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${IDS.gtm}"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->

<script
  async type="text/javascript"
  src="//static.klaviyo.com/onsite/js/klaviyo.js?company_id=VuDLmc"
></script>

<script>
  var _learnq = _learnq || [];
  _learnq.push(['identify', {
    // Change the line below to dynamically print the user's email.
    '$email' : '{{ email }}'
  }]);
</script>`;

const KLAVIYO_FOOT = `<script async src='//static.klaviyo.com/onsite/js/VuDLmc/klaviyo.js?ver=3.8.0'></script>`;
const RECAPTCHA = `<script id="elementor-recaptcha-api-js" src="https://www.google.com/recaptcha/api.js?render=explicit&#038;ver=4.1.2"></script>`;
const KLAVIYO_IDENTIFY = `<script id="kl-identify-browser-js-extra">
var klUser = {"current_user_email":"","commenter_email":""};
</script>
<script id="kl-identify-browser-js" src="/wp-assets/plugins/klaviyo/inc/js/kl-identify-browser.js?ver=3.8.0"></script>`;

const block = (where: "head" | "body", html: string) => <template data-ks-tags={where} dangerouslySetInnerHTML={{ __html: html }} />;

/** Goes into <head> (moved there after the build). */
export const HeadTags = () => block("head", tagsOff ? ADDTOANY : `${ADDTOANY}\n${HEAD}`);
/** First thing in <body>. */
export const BodyTags = () => (tagsOff ? null : block("body", BODY));
/** End of <body>. */
export const FootTags = () => block("body", tagsOff ? RECAPTCHA : `${KLAVIYO_FOOT}\n${RECAPTCHA}\n${KLAVIYO_IDENTIFY}`);
