import { Resend } from 'resend';

// Use direct API key configuration for reliability
export async function getUncachableResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  
  if (!apiKey) {
    throw new Error('RESEND_API_KEY environment variable not found');
  }
  
  return {
    client: new Resend(apiKey),
    fromEmail: 'BuildMyChatbot.Ai <support@buildmychatbot.ai>'
  };
}
