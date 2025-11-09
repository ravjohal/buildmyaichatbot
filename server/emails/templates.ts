// Email HTML templates
export const emailTemplates = {
  newUserSignup: (data: {
    userName: string;
    userEmail: string;
    signupDate: string;
  }) => ({
    subject: `New User Signup: ${data.userName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #10B981; color: white; padding: 20px; text-align: center; }
          .content { background-color: #f9f9f9; padding: 20px; margin-top: 20px; }
          .field { margin-bottom: 15px; }
          .field-label { font-weight: bold; color: #666; }
          .field-value { margin-top: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 New User Signup!</h1>
          </div>
          <div class="content">
            <p>A new user has signed up for BuildMyChatbot.Ai!</p>
            
            <div class="field">
              <div class="field-label">Name:</div>
              <div class="field-value">${data.userName}</div>
            </div>
            
            <div class="field">
              <div class="field-label">Email:</div>
              <div class="field-value"><a href="mailto:${data.userEmail}">${data.userEmail}</a></div>
            </div>
            
            <div class="field">
              <div class="field-label">Signup Date:</div>
              <div class="field-value">${data.signupDate}</div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  }),

  newLead: (data: {
    chatbotName: string;
    leadName?: string;
    leadEmail?: string;
    leadPhone?: string;
    leadCompany?: string;
    leadMessage?: string;
    conversationUrl: string;
  }) => ({
    subject: `New Lead Captured: ${data.chatbotName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #0EA5E9; color: white; padding: 20px; text-align: center; }
          .content { background-color: #f9f9f9; padding: 20px; margin-top: 20px; }
          .field { margin-bottom: 15px; }
          .field-label { font-weight: bold; color: #666; }
          .field-value { margin-top: 5px; }
          .button { display: inline-block; background-color: #0EA5E9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎯 New Lead Captured!</h1>
          </div>
          <div class="content">
            <p>A new lead has been captured from your chatbot <strong>${data.chatbotName}</strong>.</p>
            
            ${data.leadName ? `
              <div class="field">
                <div class="field-label">Name:</div>
                <div class="field-value">${data.leadName}</div>
              </div>
            ` : ''}
            
            ${data.leadEmail ? `
              <div class="field">
                <div class="field-label">Email:</div>
                <div class="field-value"><a href="mailto:${data.leadEmail}">${data.leadEmail}</a></div>
              </div>
            ` : ''}
            
            ${data.leadPhone ? `
              <div class="field">
                <div class="field-label">Phone:</div>
                <div class="field-value">${data.leadPhone}</div>
              </div>
            ` : ''}
            
            ${data.leadCompany ? `
              <div class="field">
                <div class="field-label">Company:</div>
                <div class="field-value">${data.leadCompany}</div>
              </div>
            ` : ''}
            
            ${data.leadMessage ? `
              <div class="field">
                <div class="field-label">Message:</div>
                <div class="field-value">${data.leadMessage}</div>
              </div>
            ` : ''}
            
            <a href="${data.conversationUrl}" class="button">View Full Conversation</a>
          </div>
        </div>
      </body>
      </html>
    `
  }),

  unansweredQuestion: (data: {
    chatbotName: string;
    question: string;
    aiResponse: string;
    conversationUrl: string;
    timeSinceAsked: string;
  }) => ({
    subject: `Unanswered Question Alert: ${data.chatbotName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #EF4444; color: white; padding: 20px; text-align: center; }
          .content { background-color: #f9f9f9; padding: 20px; margin-top: 20px; }
          .question-box { background-color: white; border-left: 4px solid #EF4444; padding: 15px; margin: 15px 0; }
          .response-box { background-color: #FEF2F2; border-left: 4px solid #FCA5A5; padding: 15px; margin: 15px 0; }
          .button { display: inline-block; background-color: #EF4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⚠️ Unanswered Question Detected</h1>
          </div>
          <div class="content">
            <p>Your chatbot <strong>${data.chatbotName}</strong> may have provided an insufficient answer.</p>
            <p><small>Asked ${data.timeSinceAsked}</small></p>
            
            <div class="question-box">
              <strong>Customer Question:</strong>
              <p>${data.question}</p>
            </div>
            
            <div class="response-box">
              <strong>AI Response:</strong>
              <p>${data.aiResponse}</p>
            </div>
            
            <p>Consider:</p>
            <ul>
              <li>Adding this information to your knowledge base</li>
              <li>Creating a manual answer override</li>
              <li>Reaching out to the customer directly</li>
            </ul>
            
            <a href="${data.conversationUrl}" class="button">View Conversation & Train Answer</a>
          </div>
        </div>
      </body>
      </html>
    `
  })
};
