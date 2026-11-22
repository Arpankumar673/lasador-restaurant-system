export const siteConfig = {
  name: "L'Asador – Grill & Brew",
  tagline: "Artisanal Wood-Fired Grill & Craft Microbrewery",
  description:
    "An independent culinary destination in Mohali, Punjab featuring artisanal wood-fired grills, prime smoked cuts, and in-house handcrafted craft beers.",
  location: {
    address: "Sector 82, JLPL Industrial Area",
    city: "Mohali",
    state: "Punjab",
    pincode: "140308",
    country: "India",
  },
  contact: {
    phone: "+91 98765 43210",
    email: "reservations@lasador.in",
  },
  hours: {
    weekdays: "12:00 PM – 11:30 PM",
    weekends: "12:00 PM – 12:30 AM",
  },
  brand: {
    primaryColor: "#E05A1B", // Flame ember
    darkBg: "#1A1614", // Charred wood charcoal
    deepBg: "#0D0B0A", // Obsidian grill
    accentMalt: "#EBC17E", // Golden malt
    accentCopper: "#D48B46", // Brewery copper kettle
    accentHops: "#2E6B38", // Fresh hops
  },
  nav: {
    main: [
      { title: "Home", href: "/" },
      { title: "Grill & Brew Concept", href: "#concept" },
      { title: "Craft Taps", href: "#craft-taps" },
      { title: "Wood-Fired Specialties", href: "#grill" },
      { title: "Admin Portal", href: "/admin" },
    ],
    admin: [
      { title: "Overview", href: "/admin" },
      { title: "Live Orders", href: "/admin/orders", phase: "Phase 6-8" },
      { title: "Kitchen Display (KDS)", href: "/admin/kitchen", phase: "Phase 7" },
      { title: "Menu Catalog", href: "/admin/menu", phase: "Phase 4" },
      { title: "Table & QR Management", href: "/admin/tables", phase: "Phase 5" },
      { title: "Analytics & Reports", href: "/admin/analytics", phase: "Phase 8" },
      { title: "Restaurant Settings", href: "/admin/settings", phase: "Phase 3" },
    ],
  },
};
