/**
 * Knowledge base for the AGENT help bot.
 * Agent-focused — points to dashboard sections (anchors) and explains how to use features.
 */

export interface AgentHelpTopic {
  id: string;
  category: string;
  title: string;
  anchor: string;        // section anchor on the dashboard (e.g. "#courses") or a route
  routeLabel: string;    // human label for where it is
  keywords: string[];
  summary: string;
  steps: string[];
}

export const AGENT_HELP_TOPICS: AgentHelpTopic[] = [
  {
    id: "courses-watch",
    category: "Training",
    title: "Watch a training course",
    anchor: "#courses",
    routeLabel: "Dashboard → Training & courses",
    keywords: ["course", "courses", "video", "training", "watch", "learn", "module", "lesson", "certificate"],
    summary: "Find your assigned and available courses, watch videos, and earn certificates.",
    steps: [
      "Scroll to the 'Training & courses' section on your dashboard.",
      "Click a course card to open it, then pick a module from the syllabus.",
      "Watch the video — your progress saves automatically as you watch.",
      "When you finish all modules, a Certificate of Completion becomes available to download/share.",
    ],
  },
  {
    id: "courses-progress",
    category: "Training",
    title: "Check my course progress",
    anchor: "#dashboard",
    routeLabel: "Dashboard → My course progress",
    keywords: ["progress", "completion", "how much", "left off", "continue", "my courses"],
    summary: "See where you left off and how much of each course you've completed.",
    steps: [
      "At the top of your dashboard, the 'My course progress' panel shows active courses with completion rings.",
      "Click 'Continue learning' to jump back into a course.",
    ],
  },
  {
    id: "listings",
    category: "Pre-Construction",
    title: "Browse pre-construction listings",
    anchor: "#listings",
    routeLabel: "Dashboard → Pre-con listings",
    keywords: ["listing", "listings", "pre-con", "precon", "project", "projects", "developer", "condo", "townhome", "price"],
    summary: "Browse pre-con projects, filter by city/type/status, and view full details.",
    steps: [
      "Scroll to the pre-construction listings section.",
      "Use the filters (city, property type, sales status, search) to narrow results.",
      "Click a listing card to open full details, gallery, co-op %, and documents.",
    ],
  },
  {
    id: "listing-docs",
    category: "Pre-Construction",
    title: "Download project documents (floor plans, price list)",
    anchor: "#listings",
    routeLabel: "Listing detail → Project Documents",
    keywords: ["floor plan", "price list", "incentives", "project details", "presentation", "pdf", "download", "documents", "brochure"],
    summary: "Each listing has downloadable PDFs — floor plans, price lists, incentives, and more.",
    steps: [
      "Open a listing by clicking its card.",
      "Scroll to 'Project Documents' in the detail panel.",
      "Download individual files or click 'Download all'.",
    ],
  },
  {
    id: "library",
    category: "Pre-Construction",
    title: "Find brokerage forms (clauses, schedule B, etc.)",
    anchor: "#listings",
    routeLabel: "Dashboard → Pre-con document library",
    keywords: ["clauses", "schedule b", "showing instructions", "deal sheet", "offer data sheet", "forms", "templates", "library"],
    summary: "Shared brokerage forms and templates you can download.",
    steps: [
      "In the pre-construction section, find the 'Pre-con document library' tiles.",
      "Click a tile (e.g. Clauses, Schedule B) to download or open it.",
    ],
  },
  {
    id: "worksheet",
    category: "Pre-Construction",
    title: "Submit a pre-con worksheet",
    anchor: "#listings",
    routeLabel: "Dashboard → Pre-con worksheet",
    keywords: ["worksheet", "submit", "client", "purchaser", "registration", "client id"],
    summary: "Fill and submit a client worksheet — it emails you and the admin a copy.",
    steps: [
      "In the pre-con section, click the 'Pre-con worksheet' tile.",
      "Fill in unit details, broker info, and purchaser details, and attach the client ID.",
      "Submit — you and the admin both receive an email copy automatically.",
    ],
  },
  {
    id: "hst-calc",
    category: "Calculators",
    title: "Use the HST calculator",
    anchor: "#hst-calculator-anchor",
    routeLabel: "Dashboard → HST calculator",
    keywords: ["hst", "tax", "calculator", "net price", "rebate"],
    summary: "Calculate the net-of-HST price on a sale.",
    steps: ["Find the HST calculator in the pre-con section.", "Enter the sale price to see the net amount before HST."],
  },
  {
    id: "commission-calc",
    category: "Calculators",
    title: "Use the commission calculator",
    anchor: "#commission-calculator-anchor",
    routeLabel: "Dashboard → Co-op commission calculator",
    keywords: ["commission", "co-op", "coop", "calculator", "payout", "earnings", "how much will i make"],
    summary: "Estimate your co-op commission dollars from a sale price and co-op %.",
    steps: ["Find the commission calculator next to the HST calculator.", "Enter the sale price and co-op % to see your estimated payout."],
  },
  {
    id: "booking",
    category: "Office",
    title: "Book a meeting room",
    anchor: "#offices",
    routeLabel: "Dashboard → Office Locations & Booking",
    keywords: ["book", "room", "meeting room", "office", "mississauga", "brampton", "reserve", "boardroom"],
    summary: "Reserve a meeting room at either office by picking a day and time.",
    steps: [
      "Scroll to 'Office Locations & Booking'.",
      "Pick a location (Mississauga or Brampton), then a day on the week strip.",
      "Click a green time slot on the room you want, enter a meeting title, and confirm.",
      "Your bookings show '✓ Yours' — click them to cancel.",
    ],
  },
  {
    id: "calendar",
    category: "Calendar",
    title: "View events & add reminders",
    anchor: "#dashboard",
    routeLabel: "Dashboard → Calendar & Events",
    keywords: ["calendar", "event", "events", "reminder", "rsvp", "schedule", "add reminder", "deadline"],
    summary: "See brokerage events and add your own personal reminders.",
    steps: [
      "The 'Calendar & Events' panel is near the top of your dashboard.",
      "Click an event to see details and RSVP.",
      "Click 'Add Reminder' to create a personal reminder — it shows on your calendar and notifications bell.",
    ],
  },
  {
    id: "vendors",
    category: "Resources",
    title: "Find approved vendors",
    anchor: "#vendors",
    routeLabel: "Dashboard → Vendor directory",
    keywords: ["vendor", "vendors", "plumber", "electrician", "lawyer", "mortgage", "inspector", "contact", "trades", "referral"],
    summary: "Browse approved vendors by category and call/email them directly.",
    steps: [
      "Scroll to the 'Vendor directory' section.",
      "Expand a category (Plumber, Lawyer, etc.) and tap Call or Email on a vendor card.",
    ],
  },
  {
    id: "support",
    category: "Support",
    title: "Get help from admin (support chat)",
    anchor: "#support",
    routeLabel: "Dashboard → Marketing & Tech Support",
    keywords: ["support", "help", "ticket", "chat", "question", "contact admin", "issue", "problem"],
    summary: "Open a support ticket and chat with the admin team in real time.",
    steps: [
      "Scroll to the 'Marketing & Tech Support' section.",
      "Click 'New Ticket', describe your issue, and submit.",
      "Reply in the chat — the admin team gets notified and responds.",
    ],
  },
  {
    id: "notifications",
    category: "Account",
    title: "See my notifications",
    anchor: "#top",
    routeLabel: "Top bar → bell icon",
    keywords: ["notification", "notifications", "bell", "alerts", "messages", "updates"],
    summary: "The bell icon in the top bar shows reminders, course alerts, events, and admin messages.",
    steps: ["Click the bell icon in the top-right header to see your notifications.", "Click a notification to jump to the related item."],
  },
  {
    id: "profile",
    category: "Account",
    title: "Update my profile & photo",
    anchor: "/profile",
    routeLabel: "Profile page (avatar menu → Profile)",
    keywords: ["profile", "photo", "avatar", "name", "email", "account", "settings", "picture"],
    summary: "Edit your name, email, and profile photo.",
    steps: ["Click your avatar in the top-right, then 'Profile'.", "Update your details or upload a new photo and save."],
  },
  {
    id: "hide-coop",
    category: "Account",
    title: "Hide co-op % in front of clients",
    anchor: "#top",
    routeLabel: "Avatar menu → 'Hide co-op % on listings'",
    keywords: ["hide commission", "hide co-op", "client", "privacy", "commission visible"],
    summary: "Toggle to hide commission percentages when showing the portal to clients.",
    steps: ["Click your avatar in the top-right.", "Toggle 'Hide co-op % on listings' on/off."],
  },
];

export const AGENT_HELP_CATEGORIES = Array.from(new Set(AGENT_HELP_TOPICS.map((t) => t.category)));

export const AGENT_SUGGESTED_QUESTIONS = [
  "How do I watch a course?",
  "Where do I book a meeting room?",
  "How do I find floor plans?",
  "Where is the commission calculator?",
  "How do I contact support?",
  "Where do I find vendors?",
];
