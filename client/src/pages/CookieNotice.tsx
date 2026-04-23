import LegalPage from "@/components/LegalPage";

export default function CookieNotice() {
  return (
    <LegalPage title="Cookie Notice" lastUpdated="17 April 2026">
      <p>This Cookie Notice explains how ARFA ("ARFA," "we," "us," or "our") uses cookies and similar technologies on https://arfa.global/ (the "Site"). It should be read together with our Privacy Policy.</p>

      <h2>1. What are cookies?</h2>
      <p>Cookies are small text files placed on your device when you visit a website. They help websites function, remember certain information, understand how visitors use the site, and improve performance and user experience.</p>
      <p>We may also use similar technologies such as pixels, tags, local storage, and analytics scripts. For simplicity, this notice refers to all such technologies as "cookies" unless the context requires otherwise.</p>

      <h2>2. Why we use cookies</h2>
      <p>We may use cookies to make the Site work properly, to remember your preferences or settings, to understand how visitors use the Site, to improve performance and usability, to maintain security, and, where applicable, to support communications or limited marketing functions.</p>

      <h2>3. Types of cookies we may use</h2>

      <h3>a. Strictly necessary cookies</h3>
      <p>These cookies are necessary for the Site to function properly and to provide core features such as page navigation, security, form handling, and session management. These cookies do not usually require consent under EU cookie rules when they are genuinely necessary for the service requested by the user.</p>

      <h3>b. Preference or functionality cookies</h3>
      <p>These cookies remember your choices and settings, such as language preferences, region, or interface settings, to improve your experience on the Site. Depending on how they are implemented, these cookies may require your consent.</p>

      <h3>c. Analytics cookies</h3>
      <p>These cookies help us understand how visitors interact with the Site, such as which pages are visited, how long users stay, which devices or browsers are used, and how visitors arrive at the Site. Where required by applicable law, we will use analytics cookies only with your consent.</p>

      <h3>d. Third-party cookies</h3>
      <p>Some cookies may be set by third-party service providers whose tools or services we use, such as website hosting, analytics, embedded media, forms, or newsletter providers. If third-party cookies are used, they will be subject not only to this Notice but also to the relevant third party's own privacy and cookie policies.</p>

      <h2>4. Legal basis and consent</h2>
      <p>Where personal data is processed through cookies, the GDPR framework requires a legal basis for that processing, and the EU's cookie rules require consent for many non-essential cookies.</p>
      <ul>
        <li>Strictly necessary cookies are used because they are necessary for the operation of the Site.</li>
        <li>Non-essential cookies are used only where you have given consent, where required by law.</li>
      </ul>
      <p>You may withdraw or adjust your cookie preferences at any time using our cookie settings tool, where available.</p>

      <h2>5. How to manage cookies</h2>
      <p>You can manage cookies through the cookie banner or preference centre on the Site, through your browser settings, by deleting stored cookies from your device, or by using browser tools that block certain tracking technologies.</p>
      <p>Please note that disabling strictly necessary cookies may affect the operation, security, or availability of some parts of the Site.</p>

      <h2>6. Cookies we may use on arfa.global</h2>
      <p>The exact cookies used on the Site may change over time depending on how the Site is built and which services are enabled. The categories below reflect the intended structure:</p>

      <div className="grid gap-4 sm:grid-cols-2 my-6">
        <div className="rounded-lg border border-border bg-card p-4">
          <h4 className="font-semibold text-sm mb-2">Strictly necessary</h4>
          <p className="text-sm text-muted-foreground">Basic site delivery, security, form submission, session management, load balancing, consent-preference storage.</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <h4 className="font-semibold text-sm mb-2">Preferences</h4>
          <p className="text-sm text-muted-foreground">Saving interface choices, remembering user settings, improving navigation experience.</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <h4 className="font-semibold text-sm mb-2">Analytics</h4>
          <p className="text-sm text-muted-foreground">Measuring site visits, understanding page performance, improving content and user experience.</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <h4 className="font-semibold text-sm mb-2">Third-party integrations</h4>
          <p className="text-sm text-muted-foreground">Embedded video or media, newsletter forms, analytics tools, scheduling tools, hosted forms, external widgets.</p>
        </div>
      </div>

      <h2>7. Retention</h2>
      <p>Some cookies last only for the duration of your browsing session ("session cookies"), while others remain on your device for a longer period ("persistent cookies"). Retention periods vary depending on the cookie's purpose and configuration. We aim to keep cookie lifetimes proportionate to their purpose.</p>

      <h2>8. Personal data collected through cookies</h2>
      <p>Some cookies may collect or generate personal data, such as IP addresses, device identifiers, browser information, usage behaviour, or approximate geolocation. Where that happens, our Privacy Policy also applies.</p>

      <h2>9. Third-party services</h2>
      <p>Depending on the tools used on the Site, cookies may be placed by or data may be shared with third-party providers such as website hosting or infrastructure providers, analytics providers, email/newsletter platforms, embedded content providers, form or scheduling providers. You should review the privacy and cookie policies of those providers where relevant.</p>

      <h2>10. Your data protection rights</h2>
      <p>Where the GDPR applies, you may have rights in relation to personal data processed through cookies or similar technologies, including the right to be informed, the right of access, the right to rectification, the right to erasure, the right to restriction of processing, the right to data portability, the right to object, and rights related to automated decision-making. Where processing is based on consent, you may withdraw that consent at any time.</p>

      <h2>11. Updates to this Cookie Notice</h2>
      <p>We may update this Cookie Notice from time to time to reflect changes in the Site, the cookies we use, applicable law, or our operational practices. The updated version will be posted on this page with a revised "Last updated" date.</p>

      <h2>12. Contact</h2>
      <p>If you have questions about this Cookie Notice or our use of cookies, please contact:</p>
      <p>ARFA<br />Website: <a href="https://arfa.global/" className="text-primary hover:underline">https://arfa.global/</a><br />Email: <a href="mailto:support@arfa.global" className="text-primary hover:underline">support@arfa.global</a></p>
    </LegalPage>
  );
}
