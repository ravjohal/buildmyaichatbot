import { getUncachableResendClient } from './resend-client';
import { emailTemplates } from './templates';

export class NotificationService {
  async sendNewUserSignupNotification(
    toEmail: string,
    data: {
      userName: string;
      userEmail: string;
      signupDate: string;
    }
  ) {
    try {
      const { client, fromEmail } = await getUncachableResendClient();
      const template = emailTemplates.newUserSignup(data);
      
      const result = await client.emails.send({
        from: fromEmail,
        to: toEmail,
        subject: template.subject,
        html: template.html,
      });
      
      console.log(`[EMAIL] New user signup notification sent to ${toEmail}:`, result);
    } catch (error) {
      console.error('[EMAIL] Failed to send new user signup notification:', error);
      // Don't throw - signup should succeed even if email fails
    }
  }

  async sendNewLeadNotification(
    toEmail: string,
    data: {
      chatbotName: string;
      leadName?: string;
      leadEmail?: string;
      leadPhone?: string;
      leadCompany?: string;
      leadMessage?: string;
      conversationUrl: string;
    }
  ) {
    try {
      const { client, fromEmail } = await getUncachableResendClient();
      const template = emailTemplates.newLead(data);
      
      const result = await client.emails.send({
        from: fromEmail,
        to: toEmail,
        subject: template.subject,
        html: template.html,
      });
      
      console.log(`[EMAIL] New lead notification sent to ${toEmail}:`, result);
    } catch (error) {
      console.error('[EMAIL] Failed to send new lead notification:', error);
      throw error;
    }
  }

  async sendUnansweredQuestionNotification(
    toEmail: string,
    data: {
      chatbotName: string;
      question: string;
      aiResponse: string;
      conversationUrl: string;
      timeSinceAsked: string;
    }
  ) {
    try {
      const { client, fromEmail } = await getUncachableResendClient();
      const template = emailTemplates.unansweredQuestion(data);
      
      const result = await client.emails.send({
        from: fromEmail,
        to: toEmail,
        subject: template.subject,
        html: template.html,
      });
      
      console.log(`[EMAIL] Unanswered question notification sent to ${toEmail}:`, result);
    } catch (error) {
      console.error('[EMAIL] Failed to send unanswered question notification:', error);
      throw error;
    }
  }
}

export const notificationService = new NotificationService();
