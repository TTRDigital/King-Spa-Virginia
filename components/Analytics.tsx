/*
 * The live site's tags, same IDs: Google Tag Manager, the gtag for
 * UA-210625545-1, Meta Pixel, Hotjar, Clixtell, Ahrefs Analytics and Klaviyo.
 * They start on the visitor's first scroll/tap/key/mouse move, or 3 seconds
 * after the page has loaded, so they never hold up the first paint. A plain
 * inline script: the pages run without React in the browser.
 * NEXT_PUBLIC_DISABLE_TAGS=1 switches them off (local testing).
 */
const IDS = {
  gtm: process.env.NEXT_PUBLIC_GTM_ID || "GTM-KS6SM3Q",
  ua: process.env.NEXT_PUBLIC_GA_ID || "UA-210625545-1",
  pixel: "739402377460902",
  hotjar: 2992606,
  ahrefs: "qCLRaxZsrrhdGCTNAO5eSA",
  klaviyo: "VuDLmc",
};

const LOADER = `(function(){var done=false;function go(){if(done)return;done=true;
var d=document,w=window;function s(src,attrs){var e=d.createElement('script');e.async=true;e.src=src;if(attrs)for(var k in attrs)e.setAttribute(k,attrs[k]);d.head.appendChild(e);return e}
w.dataLayer=w.dataLayer||[];w.dataLayer.push({'gtm.start':new Date().getTime(),event:'gtm.js'});s('https://www.googletagmanager.com/gtm.js?id=${IDS.gtm}');
w.gtag=w.gtag||function(){w.dataLayer.push(arguments)};w.gtag('js',new Date());w.gtag('config','${IDS.ua}');s('https://www.googletagmanager.com/gtag/js?id=${IDS.ua}');
!function(f,b,e,v,n,t,q){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];s(v)}(w,d,'script','https://connect.facebook.net/en_US/fbevents.js');w.fbq('init','${IDS.pixel}');w.fbq('track','PageView');
w.hj=w.hj||function(){(w.hj.q=w.hj.q||[]).push(arguments)};w._hjSettings={hjid:${IDS.hotjar},hjsv:6};s('https://static.hotjar.com/c/hotjar-'+w._hjSettings.hjid+'.js?sv='+w._hjSettings.hjsv);
s(d.location.protocol+'//scripts.clixtell.com/track.js');
s('https://analytics.ahrefs.com/analytics.js',{'data-key':'${IDS.ahrefs}'});
w._learnq=w._learnq||[];w._learnq.push(['identify',{'$email':'{{ email }}'}]);s('https://static.klaviyo.com/onsite/js/klaviyo.js?company_id=${IDS.klaviyo}');
}
var ev=['scroll','pointerdown','keydown','mousemove','touchstart'];ev.forEach(function(e){addEventListener(e,go,{once:true,passive:true})});
function later(){setTimeout(go,3000)}if(document.readyState==='complete')later();else addEventListener('load',later);})();`;

export function Analytics() {
  if (process.env.NEXT_PUBLIC_DISABLE_TAGS === "1") return null;
  return (
    <>
      <script id="ks-tags" dangerouslySetInnerHTML={{ __html: LOADER }} />
      <noscript>
        <iframe src={`https://www.googletagmanager.com/ns.html?id=${IDS.gtm}`} height="0" width="0" style={{ display: "none", visibility: "hidden" }} title="Google Tag Manager" />
      </noscript>
    </>
  );
}
