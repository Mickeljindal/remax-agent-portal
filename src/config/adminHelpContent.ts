/**
 * Central knowledge base for the Admin Documentation page AND the AI Help Bot.
 * Each entry describes a feature: where it lives, what it does, and how to use it.
 * The bot matches user questions against keywords + title + content.
 */

export interface HelpTopic {
  id: string;
  category: string;
  title: string;
  route: string;          // where in the app this feature lives
  routeLabel: string;     // human label for the location
  keywords: string[];     // for bot matching
  summary: string;        // short one-liner
  steps: string[];        // how-to steps
}

export const ADMIN_HELP_TOPICS: HelpTopic[] = [
  // ─── COURSES ───────────────────────────────────────────────
  {
    id: "courses-create",
    category: "Training & Courses",
    title: "Create a course & add video modules",
    route: "/admin/courses",
    routeLabel: "Admin Panel → Course management",
    keywords: ["course", "courses", "video", "module", "training", "upload video", "add course", "lesson", "udemy"],
    summary: "Create courses and upload video lessons that agents watch with tracked progress.",
    steps: [
      "Go to Admin Panel and click the 'Course management' card (or open /admin/courses).",
      "Click 'New Course', fill in the title, description, category, and thumbnail.",
      "After saving, click the course to expand it, then click 'Module' to add a lesson.",
      "In the module dialog, either UPLOAD a video file (stored on your server with a progress bar) or paste a YouTube/Vimeo embed URL.",
      "Set the duration in minutes so watch-time auto-completion works.",
      "Agents see the course on their dashboard under 'Training & courses'.",
    ],
  },
  {
    id: "courses-assign",
    category: "Training & Courses",
    title: "Assign a course to an agent",
    route: "/admin/course-assignments",
    routeLabel: "Admin Panel → Course assignments",
    keywords: ["assign course", "course assignment", "mandatory", "due date", "assign training"],
    summary: "Assign specific courses to specific agents with optional due dates.",
    steps: [
      "Open Admin Panel → 'Course assignments' (/admin/course-assignments).",
      "Pick an agent and a course, set an optional due date and note.",
      "Click 'Assign course'. The agent gets an email + sees an 'Assigned' badge on the course.",
    ],
  },
  {
    id: "courses-analytics",
    category: "Training & Courses",
    title: "View course completion & watch-time analytics",
    route: "/admin/course-analytics",
    routeLabel: "Admin Panel → Course analytics",
    keywords: ["analytics", "completion", "watch time", "progress", "certificate", "who completed", "stats", "report"],
    summary: "See per-agent completion rates, total watch time, and issued certificates.",
    steps: [
      "Open Admin Panel → 'Course analytics' (/admin/course-analytics).",
      "Use the tabs: 'Per Agent' for individual progress, 'Per Course' for course stats, 'Certificates' for completions.",
    ],
  },

  // ─── LISTINGS ──────────────────────────────────────────────
  {
    id: "listings-manage",
    category: "Listings & Pre-Con",
    title: "Add or edit a pre-construction listing",
    route: "/admin/listings",
    routeLabel: "Admin Panel → Listings & categories",
    keywords: ["listing", "project", "pre-con", "precon", "property", "add listing", "developer", "price", "commission", "co-op"],
    summary: "Full CRUD for pre-con listings with tags, types, statuses, images, phone, and co-op %.",
    steps: [
      "Open Admin Panel → 'Listings & categories' (/admin/listings).",
      "On the Listings tab, click 'Add Listing'.",
      "Fill in name, developer, city, type, status, price, co-op %, and contact phone.",
      "Toggle 'Show phone to agents' and 'Show co-op % to agents' as needed.",
      "Upload a thumbnail and gallery images, select tags, then Create.",
    ],
  },
  {
    id: "listings-tags",
    category: "Listings & Pre-Con",
    title: "Manage tags, property types & statuses",
    route: "/admin/listings",
    routeLabel: "Admin Panel → Listings & categories (tabs)",
    keywords: ["tag", "tags", "category", "categories", "status", "property type", "move-in ready", "new", "featured", "hot"],
    summary: "Create the tags, property types, and sales statuses used on listing cards and filters.",
    steps: [
      "Open /admin/listings and use the tabs: Tags, Property Types, Statuses, Cities.",
      "Add/edit/delete entries — these populate the dropdowns and badges on listings.",
      "'Move-In Ready', 'Now Selling', 'Coming Soon' etc. are managed under the Statuses tab.",
    ],
  },
  {
    id: "listings-docs",
    category: "Listings & Pre-Con",
    title: "Attach PDFs to a specific listing",
    route: "/admin/listings",
    routeLabel: "Admin Panel → Listings → 'PDFs' button",
    keywords: ["pdf", "floor plan", "price list", "incentives", "project details", "presentation", "documents", "download"],
    summary: "Upload project details, price lists, floor plans, incentives, and presentations per listing.",
    steps: [
      "Open /admin/listings, find the listing, and click the 'PDFs' button in its row.",
      "Enter a title, pick a type (Floor Plans, Price List, etc.), and upload the file.",
      "Agents see these in the listing detail with single + 'Download all' buttons.",
    ],
  },
  {
    id: "precon-library",
    category: "Listings & Pre-Con",
    title: "Manage the shared document library",
    route: "/admin/precon-library",
    routeLabel: "Admin Panel → Pre-con document library",
    keywords: ["library", "showing instructions", "clauses", "schedule b", "deal sheet", "offer data sheet", "forms", "templates", "shared documents"],
    summary: "Brokerage-wide forms (Showing Instructions, Clauses, Schedule B, etc.) shared across all listings.",
    steps: [
      "Open Admin Panel → 'Pre-con document library' (/admin/precon-library).",
      "Click 'Add Document' or edit a tile, then upload a file OR paste an external link.",
      "Agents see these tiles in the pre-con section and can download/open them.",
    ],
  },
  {
    id: "worksheets",
    category: "Listings & Pre-Con",
    title: "View pre-con worksheet submissions",
    route: "/admin/worksheets",
    routeLabel: "Admin Panel → Pre-con worksheets",
    keywords: ["worksheet", "submission", "client id", "purchaser", "worksheet submission"],
    summary: "Review worksheets agents submit, with status tracking and admin notes. Emails go to admin + agent automatically.",
    steps: [
      "Open Admin Panel → 'Pre-con worksheets' (/admin/worksheets).",
      "Click a row to view full details (unit, broker, purchasers).",
      "Change status (submitted → reviewed → processed) and add admin notes.",
    ],
  },

  // ─── PROPERTIES ────────────────────────────────────────────
  {
    id: "properties",
    category: "Properties",
    title: "Manage MLS-style property listings",
    route: "/admin/properties",
    routeLabel: "Admin Panel → Property management",
    keywords: ["property", "properties", "mls", "resale", "bedrooms", "square feet", "listing", "for sale"],
    summary: "Add/edit resale property listings with images, price, beds/baths, and assigned agent.",
    steps: [
      "Open Admin Panel → 'Property management' (/admin/properties).",
      "Click 'Add Property', fill in details, upload images, assign an agent, and save.",
    ],
  },

  // ─── EVENTS & CALENDAR ─────────────────────────────────────
  {
    id: "events",
    category: "Events & Calendar",
    title: "Create events & notify agents",
    route: "/admin/events",
    routeLabel: "Admin Panel → Events management",
    keywords: ["event", "events", "calendar", "rsvp", "meeting", "webinar", "notify agents", "reminder"],
    summary: "Create calendar events; agents get notified (in-app + email) and can RSVP.",
    steps: [
      "Open Admin Panel → 'Events management' (/admin/events).",
      "Click 'New Event', set date/time, location, type, and toggle 'Notify all agents'.",
      "After creating, use 'Remind' on a row to send reminders to people who RSVP'd.",
    ],
  },
  {
    id: "reminders",
    category: "Events & Calendar",
    title: "Send a reminder to an agent",
    route: "/admin/reminders",
    routeLabel: "Admin Panel → Agent reminders",
    keywords: ["reminder", "nudge", "agent reminder", "notify agent", "follow up"],
    summary: "Create per-agent reminders that show in their bell and send an email.",
    steps: [
      "Open Admin Panel → 'Agent reminders' (/admin/reminders).",
      "Pick an agent, enter a title/message, set a remind-at time, and create.",
      "The agent gets an in-app bell notification + email.",
    ],
  },

  // ─── OFFICES & BOOKING ─────────────────────────────────────
  {
    id: "booking",
    category: "Offices & Booking",
    title: "Office locations & room booking",
    route: "/dashboard",
    routeLabel: "Dashboard → Office Locations & Booking section",
    keywords: ["office", "room", "booking", "book room", "mississauga", "brampton", "meeting room", "calendar booking"],
    summary: "Agents book meeting rooms at each office by picking a day and time slot.",
    steps: [
      "The booking system shows on the agent dashboard under 'Office Locations & Booking'.",
      "Agents pick a location pill (Mississauga / Brampton), a day, then a green time slot.",
      "To edit offices/rooms, they're seeded in the database (ask developer to add an admin UI if needed).",
    ],
  },

  // ─── SUPPORT ───────────────────────────────────────────────
  {
    id: "support",
    category: "Support & Chat",
    title: "Chat with agents (support inbox)",
    route: "/admin/support",
    routeLabel: "Admin Panel → Support inbox",
    keywords: ["support", "chat", "ticket", "message", "help desk", "conversation", "inbox"],
    summary: "Reply to agent tickets or start a new conversation with any agent. Real-time + notifications.",
    steps: [
      "Open Admin Panel → 'Support inbox' (/admin/support).",
      "Pick a ticket from the left to reply, or click 'New Conversation' to message an agent.",
      "Change ticket status and the agent gets notified by bell + email.",
    ],
  },

  // ─── AGENTS ────────────────────────────────────────────────
  {
    id: "agents-approve",
    category: "Agent Management",
    title: "Approve / activate a new agent",
    route: "/admin",
    routeLabel: "Admin Panel → Agent Management table",
    keywords: ["approve", "activate", "new agent", "signup", "registration", "pending", "enable agent", "deactivate"],
    summary: "New signups stay inactive until you approve them. No one gets access without approval.",
    steps: [
      "New agents sign up and land on a 'Pending activation' page.",
      "Open Admin Panel (/admin), find them in the Agent Management table.",
      "Click the activate (check) button. To make someone an admin, click the shield button.",
      "You can also reset passwords and delete agents from here.",
    ],
  },
  {
    id: "vendors",
    category: "Other",
    title: "Manage the vendor directory",
    route: "/admin/vendors",
    routeLabel: "Admin Panel → Approved vendors",
    keywords: ["vendor", "vendors", "plumber", "electrician", "lawyer", "directory", "contacts", "trades"],
    summary: "Add approved vendors (plumbers, lawyers, etc.) that agents see in the vendor directory.",
    steps: [
      "Open Admin Panel → 'Approved vendors' (/admin/vendors).",
      "Click 'Add vendor', set category, business name, contact info, and visibility.",
    ],
  },
  {
    id: "links",
    category: "Other",
    title: "Manage resource links",
    route: "/admin/links",
    routeLabel: "Admin Panel → Manage Links",
    keywords: ["link", "links", "resource", "drive", "google drive", "url"],
    summary: "Update the Google Drive / resource URLs used across the portal.",
    steps: ["Open Admin Panel → 'Manage Links' (/admin/links) and edit the URLs."],
  },
  {
    id: "social-share",
    category: "Other",
    title: "Configure social share icons",
    route: "/admin/social-share",
    routeLabel: "Admin Panel → Social share icons",
    keywords: ["social", "share", "whatsapp", "facebook", "linkedin", "twitter", "x", "icons"],
    summary: "Toggle which share buttons (WhatsApp, Facebook, etc.) appear on listings and vendor cards.",
    steps: ["Open Admin Panel → 'Social share icons' (/admin/social-share) and toggle each platform."],
  },
  {
    id: "analytics-content",
    category: "Other",
    title: "View content engagement analytics",
    route: "/admin/analytics",
    routeLabel: "Admin Panel → Analytics Dashboard",
    keywords: ["analytics", "engagement", "views", "content views", "activity", "most viewed"],
    summary: "Track which resources agents view most and overall engagement.",
    steps: ["Open Admin Panel → 'Analytics Dashboard' (/admin/analytics)."],
  },
];

export const HELP_CATEGORIES = Array.from(new Set(ADMIN_HELP_TOPICS.map((t) => t.category)));
