import { SEO } from "@/components/SEO";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Terms of Service - BuildMyChatbot.Ai"
        description="Read the Terms of Service for BuildMyChatbot.Ai. Learn about account usage, subscription plans, acceptable use, and service guidelines."
        keywords="terms of service, terms and conditions, user agreement, legal terms"
      />
      <div className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-4xl font-bold mb-2" data-testid="text-page-title">
          Terms of Service
        </h1>
        <p className="text-muted-foreground mb-8">
          Last Updated: November 2, 2024
        </p>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">
              1. Agreement to Terms
            </h2>
            <p>
              By accessing or using BuildMyChatbot.Ai ("Service", "Platform",
              "we", "us", or "our"), you agree to be bound by these Terms of
              Service ("Terms"). If you do not agree to these Terms, you may not
              access or use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              2. Description of Service
            </h2>
            <p>
              BuildMyChatbot.Ai is a Software-as-a-Service (SaaS) platform that
              enables you to create, customize, and deploy AI-powered customer
              support chatbots for your websites. The Service uses artificial
              intelligence technology powered by Google Gemini AI to generate
              automated responses based on your provided knowledge base.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              3. Account Registration and Security
            </h2>
            <p className="mb-3">To use the Service, you must:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                Provide accurate, current, and complete information during
                registration
              </li>
              <li>Maintain and promptly update your account information</li>
              <li>Maintain the security of your password and account</li>
              <li>
                Notify us immediately of any unauthorized access or security
                breach
              </li>
              <li>
                Be responsible for all activities that occur under your account
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              4. Subscription Plans and Billing
            </h2>
            <div className="space-y-3">
              <p>
                <strong>4.1 Plans:</strong> We offer three subscription tiers:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>Free:</strong> 1 chatbot, 3 total questions, 100MB
                  storage
                </li>
                <li>
                  <strong>Pro:</strong> $29.99/month or $300/year - 5 chatbots,
                  5,000 conversations/month, 1GB storage
                </li>
                <li>
                  <strong>Scale:</strong> $99.99/month or $999/year - Unlimited
                  chatbots, 50,000 conversations/month, 5GB storage, exclusive
                  analytics access
                </li>
              </ul>

              <p>
                <strong>4.2 Billing:</strong> Subscription fees are billed in
                advance on a monthly or annual basis and are non-refundable
                except as required by law.
              </p>

              <p>
                <strong>4.3 Auto-Renewal:</strong> Your subscription will
                automatically renew unless you cancel before the renewal date.
                You can cancel anytime through your account settings.
              </p>

              <p>
                <strong>4.4 Changes to Pricing:</strong> We may modify
                subscription fees with 30 days' notice. Continued use after the
                notice period constitutes acceptance of the new pricing.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              5. Acceptable Use Policy
            </h2>
            <p className="mb-3">You agree NOT to use the Service to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Violate any applicable laws or regulations</li>
              <li>Infringe on intellectual property rights</li>
              <li>
                Transmit harmful, threatening, abusive, harassing, defamatory,
                or hateful content
              </li>
              <li>Engage in spamming, phishing, or fraudulent activities</li>
              <li>
                Create chatbots that provide medical, legal, or financial advice
                without proper disclaimers
              </li>
              <li>Distribute malware, viruses, or harmful code</li>
              <li>Interfere with or disrupt the Service or servers</li>
              <li>
                Attempt to gain unauthorized access to any portion of the
                Service
              </li>
              <li>Use the Service to compete with or replicate our business</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              6. AI-Generated Content and Limitations
            </h2>
            <div className="space-y-3">
              <p>
                <strong>6.1 No Guarantee of Accuracy:</strong> Chatbot responses
                are generated by artificial intelligence and may be inaccurate,
                incomplete, or inappropriate. We do not guarantee the accuracy,
                reliability, or completeness of any AI-generated content.
              </p>

              <p>
                <strong>6.2 Not Professional Advice:</strong> Chatbot responses
                do NOT constitute professional advice (legal, medical,
                financial, or otherwise). You are solely responsible for how you
                use and present chatbot responses to your end users.
              </p>

              <p>
                <strong>6.3 Your Responsibility:</strong> You are responsible
                for monitoring your chatbot's responses, implementing
                appropriate disclaimers, and ensuring compliance with applicable
                laws in your jurisdiction.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              7. Intellectual Property Rights
            </h2>
            <div className="space-y-3">
              <p>
                <strong>7.1 Our IP:</strong> The Service, including all
                software, features, functionality, designs, and content
                (excluding your content), is owned by us and is protected by
                copyright, trademark, and other intellectual property laws.
              </p>

              <p>
                <strong>7.2 Your Content:</strong> You retain all ownership
                rights to your content (knowledge base materials, chatbot
                configurations, and data). By using the Service, you grant us a
                limited license to use your content solely to provide the
                Service.
              </p>

              <p>
                <strong>7.3 License to Use:</strong> We grant you a limited,
                non-exclusive, non-transferable, revocable license to access and
                use the Service in accordance with these Terms.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              8. Data Privacy and Security
            </h2>
            <p>
              Your use of the Service is also governed by our{" "}
              <a href="/privacy-policy" className="text-primary underline">
                Privacy Policy
              </a>
              . We implement industry-standard security measures to protect your
              data, but we cannot guarantee absolute security. You acknowledge
              that you transmit data at your own risk.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              9. Service Level and Availability
            </h2>
            <div className="space-y-3">
              <p>
                <strong>9.1 Uptime Target:</strong> We strive to maintain 99.9%
                uptime, but we do not guarantee uninterrupted access to the
                Service.
              </p>

              <p>
                <strong>9.2 Maintenance:</strong> We may perform scheduled or
                emergency maintenance that may temporarily interrupt service. We
                will provide advance notice when possible.
              </p>

              <p>
                <strong>9.3 No Liability for Downtime:</strong> We are not
                liable for any damages resulting from service interruptions,
                downtime, or unavailability.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              10. Limitation of Liability
            </h2>
            <div className="space-y-3 bg-muted/50 border border-border rounded-md p-6">
              <p className="uppercase font-semibold">
                IMPORTANT - PLEASE READ CAREFULLY:
              </p>

              <p>
                <strong>10.1 DISCLAIMER OF WARRANTIES:</strong> THE SERVICE IS
                PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY
                KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO
                IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
                PURPOSE, OR NON-INFRINGEMENT.
              </p>

              <p>
                <strong>10.2 LIMITATION OF LIABILITY:</strong> TO THE MAXIMUM
                EXTENT PERMITTED BY LAW, IN NO EVENT SHALL BUILDMYCHATBOT.AI BE
                LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR
                PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, REVENUE, DATA, OR
                BUSINESS OPPORTUNITIES ARISING OUT OF OR RELATED TO YOUR USE OF
                THE SERVICE.
              </p>

              <p>
                <strong>10.3 MONETARY CAP:</strong> OUR TOTAL LIABILITY TO YOU
                FOR ALL CLAIMS ARISING FROM OR RELATED TO THE SERVICE SHALL NOT
                EXCEED THE AMOUNT YOU PAID US IN THE 12 MONTHS PRECEDING THE
                CLAIM, OR $100, WHICHEVER IS GREATER.
              </p>

              <p>
                <strong>10.4 EXCEPTIONS:</strong> The above limitations do not
                apply to liability for:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Death or personal injury caused by our gross negligence</li>
                <li>Fraud or fraudulent misrepresentation</li>
                <li>Willful misconduct or gross negligence</li>
                <li>Violations we cannot legally exclude or limit</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Indemnification</h2>
            <p>
              You agree to indemnify, defend, and hold harmless
              BuildMyChatbot.Ai, its officers, directors, employees, and agents
              from any claims, liabilities, damages, losses, and expenses
              (including reasonable attorneys' fees) arising from: (a) your use
              of the Service; (b) your violation of these Terms; (c) your
              violation of any third-party rights; or (d) content generated by
              your chatbots.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">12. Termination</h2>
            <div className="space-y-3">
              <p>
                <strong>12.1 Termination by You:</strong> You may terminate your
                account at any time through account settings. Termination does
                not entitle you to a refund.
              </p>

              <p>
                <strong>12.2 Termination by Us:</strong> We may suspend or
                terminate your account immediately if you violate these Terms,
                engage in fraudulent activity, or for any other reason at our
                sole discretion.
              </p>

              <p>
                <strong>12.3 Effect of Termination:</strong> Upon termination,
                your right to access the Service ceases immediately. We may
                delete your data after a reasonable period, but are not
                obligated to retain it.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              13. Third-Party Services
            </h2>
            <p>
              The Service integrates with third-party services including Google
              Gemini AI, Stripe, Google Cloud Storage, and Resend. Your use of
              these third-party services may be subject to their respective
              terms and privacy policies. We are not responsible for the
              availability, performance, or content of third-party services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              14. Modifications to Terms
            </h2>
            <p>
              We reserve the right to modify these Terms at any time. We will
              provide notice of material changes by email or through the
              Service. Your continued use of the Service after the effective
              date of changes constitutes acceptance of the modified Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              15. Governing Law and Disputes
            </h2>
            <div className="space-y-3">
              <p>
                <strong>15.1 Governing Law:</strong> These Terms are governed by
                the laws of [Your Jurisdiction], without regard to conflict of
                law principles.
              </p>

              <p>
                <strong>15.2 Dispute Resolution:</strong> Any disputes arising
                from these Terms or the Service shall first be attempted to be
                resolved through good-faith negotiation. If unsuccessful,
                disputes shall be resolved through binding arbitration in
                accordance with the rules of the American Arbitration
                Association.
              </p>

              <p>
                <strong>15.3 Class Action Waiver:</strong> You agree to resolve
                disputes on an individual basis and waive any right to
                participate in class action lawsuits.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              16. General Provisions
            </h2>
            <div className="space-y-3">
              <p>
                <strong>16.1 Entire Agreement:</strong> These Terms, together
                with our Privacy Policy, constitute the entire agreement between
                you and BuildMyChatbot.Ai.
              </p>

              <p>
                <strong>16.2 Severability:</strong> If any provision is found to
                be unenforceable, the remaining provisions will remain in full
                force and effect.
              </p>

              <p>
                <strong>16.3 No Waiver:</strong> Our failure to enforce any
                right or provision does not constitute a waiver of that right or
                provision.
              </p>

              <p>
                <strong>16.4 Assignment:</strong> You may not assign these Terms
                without our prior written consent. We may assign these Terms at
                any time.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              17. Contact Information
            </h2>
            <p>For questions about these Terms, please contact us at:</p>
            <div className="bg-muted/30 border border-border rounded-md p-4 mt-3">
              <p>
                <strong>BuildMyChatbot.Ai</strong>
              </p>
              <p>Email: support@buildmychatbot.ai</p>
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
