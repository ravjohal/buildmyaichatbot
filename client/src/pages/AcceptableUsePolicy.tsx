export default function AcceptableUsePolicy() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-4xl font-bold mb-2" data-testid="text-page-title">Acceptable Use Policy</h1>
        <p className="text-muted-foreground mb-8">Last Updated: November 2, 2024</p>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Purpose</h2>
            <p>
              This Acceptable Use Policy ("AUP") outlines prohibited uses of BuildMyChatbot.Ai and the content, services, and technology provided through our platform. 
              This policy is designed to protect our users, our platform, and the broader Internet community from inappropriate, unethical, or illegal activities.
            </p>
            <p className="mt-3">
              By using BuildMyChatbot.Ai, you agree to comply with this AUP. Violations may result in immediate suspension or termination of your account without refund.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Prohibited Content</h2>
            <p className="mb-3">You may NOT create chatbots or upload content that contains or promotes:</p>

            <h3 className="text-xl font-semibold mb-3 mt-6">2.1 Illegal Content</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Content that violates any applicable local, state, national, or international law</li>
              <li>Content that infringes on intellectual property rights (copyrights, trademarks, patents, trade secrets)</li>
              <li>Content that facilitates illegal activities or provides instructions for illegal conduct</li>
              <li>Sale of illegal goods, controlled substances, or prohibited items</li>
              <li>Child sexual abuse material (CSAM) or exploitation of minors</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">2.2 Harmful or Dangerous Content</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Content that promotes, encourages, or facilitates self-harm or suicide</li>
              <li>Instructions for creating weapons, explosives, or dangerous materials</li>
              <li>Content that promotes eating disorders or extreme dieting practices</li>
              <li>Graphic violence, gore, or torture</li>
              <li>Content that could cause physical harm to individuals</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">2.3 Hateful or Discriminatory Content</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Hate speech targeting individuals or groups based on race, ethnicity, religion, gender, sexual orientation, disability, or other protected characteristics</li>
              <li>Content that promotes discrimination, violence, or prejudice against protected groups</li>
              <li>Harassment, bullying, or threats against individuals or groups</li>
              <li>Doxxing (publishing private information without consent)</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">2.4 Fraudulent or Deceptive Content</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Phishing attempts or social engineering schemes</li>
              <li>Pyramid schemes, multi-level marketing scams, or fraudulent investment opportunities</li>
              <li>Impersonation of individuals, organizations, or brands</li>
              <li>Fake news, misinformation, or deliberate disinformation campaigns</li>
              <li>Deceptive advertising or false product claims</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">2.5 Sexual or Adult Content</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Pornographic or sexually explicit content</li>
              <li>Content promoting sexual services or escort services</li>
              <li>Non-consensual intimate imagery</li>
              <li>Sexual content involving minors</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">2.6 Malicious Code or Security Threats</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Viruses, malware, ransomware, spyware, or trojans</li>
              <li>Code designed to damage, interfere with, or gain unauthorized access to systems</li>
              <li>Scripts that exploit security vulnerabilities</li>
              <li>Denial-of-service (DoS) attacks or distributed denial-of-service (DDoS) attacks</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Prohibited Activities</h2>

            <h3 className="text-xl font-semibold mb-3 mt-6">3.1 Spam and Abuse</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Sending unsolicited bulk messages or spam</li>
              <li>Using chatbots for mass email campaigns without consent</li>
              <li>Excessive or automated queries designed to overload our systems</li>
              <li>Creating multiple accounts to circumvent usage limits</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">3.2 Unauthorized Access and Security Violations</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Attempting to gain unauthorized access to our systems, networks, or other users' accounts</li>
              <li>Reverse engineering, decompiling, or disassembling our software</li>
              <li>Circumventing security features or authentication mechanisms</li>
              <li>Probing, scanning, or testing the vulnerability of our systems</li>
              <li>Sharing or selling your account credentials</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">3.3 Competitive or Harmful Business Practices</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Using the Service to build a competing product or service</li>
              <li>Scraping or harvesting data from the platform without permission</li>
              <li>Reselling or sublicensing access to the Service without authorization</li>
              <li>Benchmarking or performance testing without prior written consent</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">3.4 Resource Abuse</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Excessive consumption of computational resources that impacts other users</li>
              <li>Cryptocurrency mining using our infrastructure</li>
              <li>Storage of backup files, archives, or non-chatbot-related content</li>
              <li>Using the Service for purposes other than creating and operating chatbots</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Specific Restrictions for AI Chatbots</h2>

            <h3 className="text-xl font-semibold mb-3 mt-6">4.1 Professional Advice Limitations</h3>
            <p className="mb-3">Chatbots created on our platform must NOT provide:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Medical Advice:</strong> Diagnosis, treatment recommendations, or health-related guidance without proper disclaimers and licensed oversight</li>
              <li><strong>Legal Advice:</strong> Legal opinions, case analysis, or legal strategy without being operated by licensed attorneys</li>
              <li><strong>Financial Advice:</strong> Investment recommendations, tax advice, or financial planning without proper licensing and disclaimers</li>
              <li><strong>Mental Health Services:</strong> Therapy, counseling, or crisis intervention without licensed professionals</li>
            </ul>
            <p className="mt-3">
              <strong>Required Disclaimer:</strong> If your chatbot discusses these topics, you MUST include prominent disclaimers that responses are informational only and not professional advice.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">4.2 Transparency Requirements</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Chatbots must clearly identify themselves as AI/automated systems</li>
              <li>Chatbots may not impersonate real people or customer service agents without disclosure</li>
              <li>Conversations must not mislead users about the nature of the interaction</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">4.3 Data Collection and Privacy</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>You must inform your website visitors that they are interacting with an AI chatbot</li>
              <li>You must disclose that conversations are collected and stored</li>
              <li>You must obtain necessary consents for data collection under applicable privacy laws (GDPR, CCPA, etc.)</li>
              <li>You must not collect sensitive personal information without proper safeguards and legal basis</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Compliance with Laws and Regulations</h2>
            <p className="mb-3">You are responsible for ensuring your use of BuildMyChatbot.Ai complies with:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>All applicable laws in your jurisdiction and your users' jurisdictions</li>
              <li>Data protection regulations (GDPR, CCPA, PIPEDA, etc.)</li>
              <li>Consumer protection laws</li>
              <li>Accessibility requirements (WCAG, ADA)</li>
              <li>Industry-specific regulations applicable to your business</li>
              <li>Export control and sanctions laws</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Monitoring and Enforcement</h2>
            <div className="space-y-3">
              <p><strong>6.1 Right to Monitor:</strong> We reserve the right to monitor chatbot content and usage to ensure compliance with this AUP, though we are not obligated to do so.</p>
              
              <p><strong>6.2 Investigation:</strong> We may investigate suspected violations and cooperate with law enforcement when appropriate.</p>
              
              <p><strong>6.3 Enforcement Actions:</strong> Violations may result in:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Warning notices</li>
                <li>Temporary suspension of chatbot or account</li>
                <li>Permanent termination without refund</li>
                <li>Removal of offending content</li>
                <li>Legal action and reporting to authorities</li>
              </ul>

              <p><strong>6.4 No Refunds:</strong> Accounts terminated for AUP violations are not eligible for refunds.</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Reporting Violations</h2>
            <p>
              If you become aware of content or activities that violate this AUP, please report it immediately to:
            </p>
            <div className="bg-muted/30 border border-border rounded-md p-4 mt-3">
              <p><strong>Abuse Reporting:</strong></p>
              <p>Email: abuse@buildmychatbot.ai</p>
              <p>Include: URL, description of violation, and any supporting evidence</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Your Responsibilities</h2>
            <p className="mb-3">As a user of BuildMyChatbot.Ai, you are responsible for:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>All content uploaded to or generated by your chatbots</li>
              <li>Monitoring your chatbot's responses and ensuring they remain appropriate</li>
              <li>Implementing appropriate content filtering and moderation</li>
              <li>Training your chatbot with accurate, legal, and appropriate content</li>
              <li>Complying with all applicable laws and regulations</li>
              <li>Responding to user complaints about your chatbot</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Changes to This Policy</h2>
            <p>
              We may update this AUP at any time to reflect changes in technology, law, or our service offerings. 
              We will provide notice of material changes. Continued use of the Service after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Contact Information</h2>
            <p className="mb-3">For questions about this Acceptable Use Policy, contact us at:</p>
            <div className="bg-muted/30 border border-border rounded-md p-4">
              <p><strong>BuildMyChatbot.Ai</strong></p>
              <p>Email: support@buildmychatbot.ai</p>
            </div>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-border">
          <a href="/" className="text-primary hover:underline" data-testid="link-home">← Back to Home</a>
        </div>
      </div>
    </div>
  );
}
