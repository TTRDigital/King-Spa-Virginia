import type { SiteSettings } from "@/lib/types";

/**
 * Business details for the site-wide DaySpa schema, taken from the live
 * site's own pages: address, phone, email and hours from the header, footer
 * and Contact Us page; the map position from the site's Google Map; social
 * links from the footer. Editable in /cms (Site settings).
 */
export const fallbackSettings: SiteSettings = {
  name: "King Spa Virginia",
  legalName: "King Spa & Sauna",
  description: "Voted Best Day Spa in Virginia, offering authentic Korean jjimjilbang experiences with saunas, body scrubs, massages, and facials in Chantilly, VA.",
  url: "https://virginia.kingspa.com/",
  phone: "(703) 957-3010",
  email: "info@kingspa.com",
  street: "25330 Eastern Marketplace Plaza",
  city: "Chantilly",
  region: "VA",
  postalCode: "20152",
  country: "US",
  latitude: 38.916372945583355,
  longitude: -77.49153232352914,
  mapsUrl: "https://goo.gl/maps/sm2KdDakbiWN6sueA",
  logo: "/images/wp/2021/08/king-spa-logo.svg",
  image: "/images/wp/2025/06/image-opt.webp",
  priceRange: "$-$$",
  // Sunday – Thursday 9 AM – 11 PM, Friday – Saturday 9 AM – 12 Midnight
  hours: [
    { days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"], opens: "09:00", closes: "23:00" },
    { days: ["Friday", "Saturday"], opens: "09:00", closes: "00:00" },
  ],
  social: ["https://www.facebook.com/kingspava", "https://www.instagram.com/kingspavirginia/", "https://www.youtube.com/channel/UCoT-UlLYxxuk7q1bMEqrA2g"],
};
