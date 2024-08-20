//const SibApiV3Sdk = require("sendinblue-api-v3-sdk");
const SibApiV3Sdk = require("sib-api-v3-sdk");
let defaultClient = SibApiV3Sdk.ApiClient.instance;

// Configure API key authorization: api-key
let apiKey = defaultClient.authentications["api-key"];
apiKey.apiKey = process.env.BREVO_EMAIL_API_KEY;

let apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

let sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail(); // SendSmtpEmail | Values to send a transactional email

// Set up your email details here
sendSmtpEmail.sender = {email: "sistemisolarirossi@gmail.com"}
sendSmtpEmail.to = [ {email: "marcosolari@gmail.com"} ];
sendSmtpEmail.subject = "Testing from Node.js";
sendSmtpEmail.htmlContent = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta http-equiv="Content-Type" content="text/html charset=UTF-8" />
    <title>Your SAAS Name - audit</title>
  </head>
  <body>
    <table role="presentation" class="email-container" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td class="email-header">
        <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/24/LEGO_logo.svg/256px-LEGO_logo.svg.png" alt="Your SAAS Logo">
        <h1>Your SAAS Name</h1>
      </td>
    </tr>
    <tr>
      <td class="email-body">
        <h2>HELLO, $userFirstName</h2>
        <p>We wanted to inform you about [specific event or update]. This is an important audit regarding your account.</p>
        <p>If you have any questions, feel free to <a href="mailto:support@yourcompany.com">contact us</a> at any time.</p>
        <a href="[Action Link]" class="email-button">Take Action</a>
      </td>
    </tr>
    <tr>
      <td class="email-footer">
        <p>&copy; 2024 Your SAAS Name. All rights reserved.</p>
        <p><a href="[unsubscribe-link]">Unsubscribe</a> | <a href="[preferences-link]">Manage Preferences</a></p>
      </td>
    </tr>
    </table>
  </body>
</html>
`;

console.log("sendSmtpEmail:", sendSmtpEmail);
apiInstance.sendTransacEmail(sendSmtpEmail).then(function(data) {
  console.log("API called successfully. Returned data: " + JSON.stringify(data));
}, function(error) {
  console.error("Error:", error);
});