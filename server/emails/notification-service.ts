import { getUncachableResendClient } from './resend-client';
import { emailTemplates } from './templates';

export class NotificationService {
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
      
      await client.emails.send({
        from: fromEmail,
        to: toEmail,
        subject: template.subject,
        html: template.html,
      });
      
      console.log(`[EMAIL] New lead notification sent to ${toEmail}`);
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
      
      await client.emails.send({
        from: fromEmail,
        to: toEmail,
        subject: template.subject,
        html: template.html,
      });
      
      console.log(`[EMAIL] Unanswered question notification sent to ${toEmail}`);
    } catch (error) {
      console.error('[EMAIL] Failed to send unanswered question notification:', error);
      throw error;
    }
  }
}

export const notificationService = new NotificationService();
