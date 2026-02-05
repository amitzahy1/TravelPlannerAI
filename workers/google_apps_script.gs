function processTravelEmails() {
  // --- CONFIGURATION ---
  const WORKER_URL = "https://travelplannerai.amitzahy1.workers.dev";
  // ---------------------

  // Search for unread emails in the Inbox
  const threads = GmailApp.search("is:unread in:inbox");
  
  if (threads.length === 0) {
    console.log("No new emails found.");
    return;
  }

  for (const thread of threads) {
    const messages = thread.getMessages();
    
    for (const message of messages) {
      if (message.isUnread()) {
        const subject = message.getSubject();
        const from = message.getFrom();
        console.log(`Processing: ${subject} from ${from}`);

        // Construct the payload matching our Worker's expected format
        const payload = {
          from: from,
          subject: subject,
          // We prefer plain text for easier AI parsing, but can send whatever is available
          content: `From: ${from}\nSubject: ${subject}\n\n${message.getPlainBody() || message.getBody()}`
        };
        
        try {
          const options = {
            method: "post",
            contentType: "application/json",
            payload: JSON.stringify(payload),
            muteHttpExceptions: true // Get error response instead of throwing
          };
          
          const response = UrlFetchApp.fetch(WORKER_URL, options);
          const responseCode = response.getResponseCode();
          
          if (responseCode === 200) {
            console.log("✅ Successfully forwarded to Worker");
            // Mark as read only if successful
            message.markRead();
            
            // Optional: Add a label 'Processed' if you want
            // const label = GmailApp.getUserLabelByName("AI-Processed") || GmailApp.createLabel("AI-Processed");
            // thread.addLabel(label);
          } else {
            console.error(`❌ Worker returned error ${responseCode}: ${response.getContentText()}`);
          }
          
        } catch (error) {
          console.error(`❌ Network error forwarding email: ${error}`);
        }
      }
    }
  }
}
