import { LegalPage, type LegalSection } from "@/components/LegalPage";
import { SITE } from "@/lib/site";

const SECTIONS: LegalSection[] = [
  {
    id: "aim",
    title: "Accessibility aim",
    paragraphs: [
      `${SITE.name} aims to make the site usable for people using keyboards, screen readers, magnification, touch devices and reduced-motion settings. The working target is to approach the Web Content Accessibility Guidelines (WCAG) 2.1 at level AA.`,
      "This is an implementation statement, not an independent certification or a guarantee of complete conformance. Accessibility is reviewed as the tools change.",
    ],
  },
  {
    id: "in-place",
    title: "Support currently in place",
    bullets: [
      "A Skip to content link, landmark regions and a logical heading hierarchy.",
      "Keyboard-operable links, buttons, fields, navigation and option groups, with a visible focus indicator.",
      "Option groups support Arrow keys plus Home and End, in addition to mouse and touch interaction.",
      "Touch-friendly controls with minimum target sizing, responsive layouts for small phones through tablets, and horizontally scrollable data tables where a narrow viewport cannot safely compress columns.",
      "Visible form labels, text error messages, programmatic status messages for saved formulas and contact submissions, and descriptive labels for icon-only controls.",
      "Every calculation waits for an explicit confirmation button (Convert, Calculate, Evaluate, Show or Filter). Pressing Enter in a field performs the same action, and a text status announces that a result is ready without revealing it early.",
      "Results hidden before confirmation are marked up as hidden from assistive technology, with a text alternative explaining that confirmation is required.",
      "Text-based calculation results that can be copied, resized and read by assistive technology. Decorative images are excluded from the accessibility tree.",
      "Reduced-motion support: non-essential transitions and decorative motion are disabled or effectively shortened when the device preference is enabled.",
      "High-contrast system-mode support and non-colour cues such as labels, arrows and text for status changes.",
    ],
  },
  {
    id: "limitations",
    title: "Known limitations",
    bullets: [
      "The economic-indicator chart can be expanded into a full table of every plotted value. The currency trend chart has a text summary of its start, end and direction but no per-point table yet.",
      "Some mathematical notation may be read differently by different screen readers, particularly matrices, complex values and unit syntax. The result is also available as selectable text.",
      "On very narrow screens, complex tables use horizontal scrolling. Column headings remain visible at the start of the table, but a frozen-header implementation is not yet in place.",
      "External reference information can occasionally be unavailable. The relevant tool displays a text message, but it may not automatically announce every background update to every assistive technology configuration.",
    ],
    note: "If a limitation blocks a task, use the contact form and select Accessibility. Describe the page and the format that would help; an alternative presentation can be considered.",
  },
  {
    id: "testing",
    title: "How the site is checked",
    paragraphs: [
      "The site is reviewed with keyboard-only navigation, browser zoom, small-screen responsive layouts, reduced-motion settings, colour contrast checks and automated structural checks. These checks are helpful but do not replace testing by people with disabilities or an independent audit.",
    ],
  },
  {
    id: "feedback",
    title: "Report an accessibility issue",
    paragraphs: [
      "Use the contact form and select Accessibility. Include the page, what you were trying to do, what happened, and the browser or assistive technology you use if you are comfortable sharing it. You may request information in an alternative format.",
    ],
  },
  {
    id: "rights",
    title: "Your rights",
    paragraphs: [
      "Nothing in this statement limits rights available under accessibility, equality or consumer law in your location. If you are dissatisfied with a response, you may be able to contact the relevant accessibility or equality body in your country.",
    ],
  },
];

export default function AccessibilityPage() {
  return (
    <LegalPage
      path="/accessibility"
      eyebrow="Accessibility statement"
      title="Accessibility: keyboard, touch and motion"
      intro={`What ${SITE.name} currently does to improve access, what remains to be improved, and how to report a barrier.`}
      sections={SECTIONS}
    />
  );
}
