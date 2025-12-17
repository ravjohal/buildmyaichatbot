import { SEO } from "@/components/SEO";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Privacy Policy - BuildMyChatbot.Ai"
        description="Learn how BuildMyChatbot.Ai collects, uses, and protects your personal information. Read our Privacy Policy for complete details on data protection."
        keywords="privacy policy, data protection, GDPR, data privacy, personal information"
      />
      <div className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-4xl font-bold mb-2" data-testid="text-page-title">
          Privacy Policy
        </h1>
        <p className="text-muted-foreground mb-8">
          Last Updated: November 2, 2024
        </p>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
            <p>
              BuildMyChatbot.Ai ("we", "us", or "our") is committed to
              protecting your privacy. This Privacy Policy explains how we
              collect, use, disclose, and safeguard your information when you
              use our Service. By using BuildMyChatbot.Ai, you consent to the
              data practices described in this policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              2. Information We Collect
            </h2>

            <h3 className="text-xl font-semibold mb-3 mt-6">
              2.1 Information You Provide Directly
            </h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Account Information:</strong> Email address, password
                (encrypted), name, and profile information
              </li>
              <li>
                <strong>Billing Information:</strong> Payment details processed
                securely through Stripe (we do not store full credit card
                numbers)
              </li>
              <li>
                <strong>Chatbot Content:</strong> Knowledge base materials
                (website URLs, uploaded documents), chatbot configurations,
                personality settings, visual customizations
              </li>
              <li>
                <strong>Communications:</strong> Messages you send us for
                support or feedback
              </li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">
              2.2 Information Collected Automatically
            </h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Usage Data:</strong> Pages visited, features used, time
                spent on Service, navigation patterns
              </li>
              <li>
                <strong>Device Information:</strong> Browser type, operating
                system, IP address, device identifiers
              </li>
              <li>
                <strong>Conversation Data:</strong> Messages exchanged between
                your website visitors and your chatbots, including timestamps,
                conversation length, and satisfaction ratings
              </li>
              <li>
                <strong>Analytics Data:</strong> Chatbot performance metrics,
                response times, conversation counts, lead captures
              </li>
              <li>
                <strong>Cookies and Tracking:</strong> Session cookies,
                preference cookies, and analytics cookies (see Section 8)
              </li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">
              2.3 Information from Third Parties
            </h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Payment Processor:</strong> Stripe provides transaction
                status and billing information
              </li>
              <li>
                <strong>AI Provider:</strong> Google Gemini AI processes your
                chatbot queries and knowledge base content
              </li>
              <li>
                <strong>Website Crawling:</strong> We collect publicly
                accessible content from URLs you provide for your chatbot's
                knowledge base
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              3. How We Use Your Information
            </h2>
            <p className="mb-3">We use your information to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Provide the Service:</strong> Create, train, and deploy
                your AI chatbots
              </li>
              <li>
                <strong>Process Payments:</strong> Handle subscription billing
                and payment processing
              </li>
              <li>
                <strong>Improve AI Responses:</strong> Train and refine chatbot
                responses using conversation data (anonymized where possible)
              </li>
              <li>
                <strong>Send Notifications:</strong> Email alerts for new leads,
                unanswered questions, and weekly performance reports (with your
                consent)
              </li>
              <li>
                <strong>Analytics:</strong> Generate usage statistics and
                performance metrics for your chatbots
              </li>
              <li>
                <strong>Customer Support:</strong> Respond to your inquiries and
                provide technical assistance
              </li>
              <li>
                <strong>Security:</strong> Detect and prevent fraud, abuse, and
                security incidents
              </li>
              <li>
                <strong>Legal Compliance:</strong> Comply with legal obligations
                and enforce our Terms of Service
              </li>
              <li>
                <strong>Service Improvements:</strong> Analyze usage patterns to
                enhance features and user experience
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              4. Data Sharing and Disclosure
            </h2>

            <h3 className="text-xl font-semibold mb-3 mt-6">
              4.1 Third-Party Service Providers
            </h3>
            <p className="mb-3">
              We share your information with trusted third parties who assist in
              operating our Service:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Google Gemini AI:</strong> Processes chatbot queries and
                generates AI responses
              </li>
              <li>
                <strong>Google Cloud Storage:</strong> Stores uploaded documents
                and files
              </li>
              <li>
                <strong>Stripe:</strong> Processes payments and manages
                subscriptions
              </li>
              <li>
                <strong>Resend:</strong> Sends transactional emails and
                notifications
              </li>
              <li>
                <strong>Database Provider:</strong> PostgreSQL database hosting
                (Neon)
              </li>
              <li>
                <strong>Hosting Infrastructure:</strong> Replit platform
                services
              </li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">
              4.2 Legal Requirements
            </h3>
            <p>
              We may disclose your information if required by law, court order,
              or government request, or to protect our rights, property, or
              safety.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">
              4.3 Business Transfers
            </h3>
            <p>
              If we undergo a merger, acquisition, or sale of assets, your
              information may be transferred to the acquiring entity.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">
              4.4 Aggregate Data
            </h3>
            <p>
              We may share anonymized, aggregated data that does not personally
              identify you for research, marketing, or analytics purposes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Data Security</h2>
            <div className="space-y-3">
              <p>
                We implement industry-standard security measures to protect your
                information:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>Encryption:</strong> Data in transit is encrypted
                  using TLS/SSL; passwords are encrypted using bcrypt
                </li>
                <li>
                  <strong>Access Controls:</strong> Role-based access
                  restrictions and authentication requirements
                </li>
                <li>
                  <strong>Secure Storage:</strong> Data stored in secure,
                  access-controlled databases and cloud storage
                </li>
                <li>
                  <strong>Regular Monitoring:</strong> Security monitoring and
                  incident response procedures
                </li>
                <li>
                  <strong>Vendor Security:</strong> Third-party providers
                  maintain SOC 2 and ISO 27001 certifications
                </li>
              </ul>
              <p className="mt-3">
                However, no method of transmission over the Internet or
                electronic storage is 100% secure. While we strive to protect
                your information, we cannot guarantee absolute security.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Data Retention</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Account Data:</strong> Retained while your account is
                active and for a reasonable period after deletion (typically 90
                days) for backup and legal purposes
              </li>
              <li>
                <strong>Conversation Data:</strong> Retained for analytics and
                training purposes; may be anonymized after 12 months
              </li>
              <li>
                <strong>Billing Records:</strong> Retained for 7 years to comply
                with tax and financial regulations
              </li>
              <li>
                <strong>Support Communications:</strong> Retained for 3 years
                for quality assurance and legal compliance
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              7. Your Privacy Rights
            </h2>

            <h3 className="text-xl font-semibold mb-3 mt-6">
              7.1 General Rights
            </h3>
            <p className="mb-3">You have the right to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Access:</strong> Request a copy of your personal data
              </li>
              <li>
                <strong>Correction:</strong> Update or correct inaccurate
                information
              </li>
              <li>
                <strong>Deletion:</strong> Request deletion of your account and
                data (subject to legal retention requirements)
              </li>
              <li>
                <strong>Data Portability:</strong> Receive your data in a
                structured, machine-readable format
              </li>
              <li>
                <strong>Object:</strong> Object to certain processing of your
                data
              </li>
              <li>
                <strong>Withdraw Consent:</strong> Withdraw consent for optional
                data processing (e.g., marketing emails)
              </li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">
              7.2 GDPR Rights (European Users)
            </h3>
            <p>
              If you are in the European Economic Area (EEA), you have
              additional rights under GDPR, including the right to lodge a
              complaint with a supervisory authority.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">
              7.3 CCPA Rights (California Users)
            </h3>
            <p className="mb-3">
              If you are a California resident, you have rights under the
              California Consumer Privacy Act (CCPA):
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                Right to know what personal information is collected, used,
                shared, or sold
              </li>
              <li>
                Right to delete personal information (with certain exceptions)
              </li>
              <li>
                Right to opt-out of the sale of personal information (we do not
                sell your data)
              </li>
              <li>Right to non-discrimination for exercising your rights</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">
              7.4 Exercising Your Rights
            </h3>
            <p>
              To exercise any of these rights, contact us at
              privacy@buildmychatbot.ai or through your account settings. We
              will respond within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              8. Cookies and Tracking Technologies
            </h2>
            <div className="space-y-3">
              <p>We use cookies and similar technologies to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>Essential Cookies:</strong> Maintain your session and
                  authentication (required for service operation)
                </li>
                <li>
                  <strong>Preference Cookies:</strong> Remember your settings
                  and preferences
                </li>
                <li>
                  <strong>Analytics Cookies:</strong> Understand how you use the
                  Service to improve features
                </li>
              </ul>
              <p className="mt-3">
                You can control cookies through your browser settings, but
                disabling essential cookies may affect Service functionality.
                Our cookie banner allows you to manage your preferences.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              9. Children's Privacy
            </h2>
            <p>
              Our Service is not intended for children under 13 (or 16 in the
              EEA). We do not knowingly collect personal information from
              children. If you believe we have collected information from a
              child, please contact us immediately, and we will delete it.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              10. International Data Transfers
            </h2>
            <p>
              Your information may be transferred to and processed in countries
              other than your country of residence. We ensure appropriate
              safeguards are in place for international transfers, including
              Standard Contractual Clauses (SCCs) for transfers from the EEA.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              11. Do Not Track Signals
            </h2>
            <p>
              Some browsers include a "Do Not Track" (DNT) feature. Our Service
              does not currently respond to DNT signals, as there is no
              industry-wide standard for how to interpret them.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              12. Your Visitor's Privacy
            </h2>
            <p>
              When you embed our chatbot widget on your website, conversations
              between your visitors and the chatbot are collected and stored.
              <strong> You are responsible for:</strong>
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li>
                Informing your visitors that you use an AI chatbot service
              </li>
              <li>
                Including our chatbot usage in your website's privacy policy
              </li>
              <li>
                Obtaining necessary consents from your visitors for data
                collection
              </li>
              <li>
                Complying with applicable privacy laws in your jurisdiction
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              13. Changes to This Privacy Policy
            </h2>
            <p>
              We may update this Privacy Policy from time to time. We will
              notify you of material changes by email or through a notice on our
              Service. The "Last Updated" date at the top reflects the most
              recent changes. Continued use after changes constitutes
              acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">14. Contact Us</h2>
            <p className="mb-3">
              For questions about this Privacy Policy or to exercise your
              privacy rights, contact us at:
            </p>
            <div className="bg-muted/30 border border-border rounded-md p-4">
              <p>
                <strong>BuildMyChatbot.Ai</strong>
              </p>
              <p>Email: support@buildmychatbot.ai</p>
              <p>Data Protection Officer: support@buildmychatbot.ai</p>
            </div>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-border">
          <a
            href="/"
            className="text-primary hover:underline"
            data-testid="link-home"
          >
            ← Back to Home
          </a>
        </div>
      </div>
    </div>
  );
}
