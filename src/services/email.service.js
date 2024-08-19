//const Brevo = require("@getbrevo/brevo");
const fs = require("fs");
const path = require("path");
const Brevo = require("sib-api-v3-sdk");
const ejs = require("ejs");
//const i18next = require("i18next");
const { logger } = require("../controllers/logger.controller");
const i18n = require("../middlewares/i18n");
const config = require("../config");

// the email service class
class EmailService {
  constructor() {
    this.apiInstance = null;
    this.regexPlaceholder = /\$\{([A-Za-z0-9_@./#&+-]+)\}/g;
    this.systemPlaceholders = {
      "_.language": config.app.company.name,
      "_.company.name": config.app.company.name,
      "_.company.title": config.app.company.title,
      "_.company.mailto": config.app.company.mailto,
      "_.company.copyright": config.app.company.copyright,
      "_.company.logo": "http://localhost:5000/favicon.ico", // TODO: inline image, for standard emails...
    };
  }

  // setup method to configure the Brevo API client
  setup(apiKey) {
    try {
      // configure API key authorization api-key
      Brevo.ApiClient.instance.authentications["api-key"].apiKey = apiKey;

      // create transactional emails api instance 
      this.apiInstance = new Brevo.TransactionalEmailsApi();
    } catch (err) {
      logger.error("Error during setup of email service:", err);
    }
    return true;
  }

  /**
   * method to send an email with HTML content
   * 
   * @param {string} to - the recipient's email address (mandatory)
   * @param {string} [toName] - the recipient's name (optional)
   * @param {string} [from] - the senders's address (optional)
   * @param {string} [fromName] - the senders's name (optional)
   * @param {string} subject - the subject of the email (mandatory)
   * @param {string} htmlContent - the HTML content of the email (mandatory)
   * @param {object} templateFilename - te filename of a file fith htmlContent (optional)
   * @param {object} templateParams - an object with params (key: value) to be substituted in htmlContent (optional)
   * @returns {boolean} a boolean value that indicates if email was sent correctly
   * 
   * Note: htmlContent and templateFilename parameters are alternative
   */
  async send(req, params) {
    try {
      if (!this.apiInstance) {
        logger.error("Email service is not initialized, please call setup() first");
        throw err;
      }

      if (!params.to) return logger.error("Parameter 'to' is mandatory to send email");
      if (!params.toName) params.toName = null;
      if (!params.from) params.from = config.email.administration.from;
      if (!params.fromName) params.fromName = config.email.administration.fromName;
      if (!params.subject) return logger.error("Parameter 'subject' is mandatory to send email");
      if (!params.htmlContent && !params.templateFilename) return logger.error("Parameter 'htmlContent' or 'templateFilename' is mandatory to send email");
      if (params.htmlContent && params.templateFilename) return logger.error("Parameters 'htmlContent' and 'templateFilename' are alternative to send email");

      // handle templates
      params.language = req.language;  //"it";
      try {
        params.htmlContent = this.renderTemplate(params.templateFilename, params.language, params.templateParams);
      } catch (err) {
        logger.error(`Error rendering template ${params.templateFilename}:`, err);
        throw err;
      }

      // create smtp email object
      let sendSmtpEmail = new Brevo.SendSmtpEmail();
      sendSmtpEmail = {
        to: [{
          email: params.to,
          name: params.toName,
        }],
        sender: {
          email: params.from,
          name: params.fromName,
        },
        subject: params.subject,
        htmlContent: params.htmlContent,
      };
   
      // send transactional email with email object
      
      // TODO: skip real email send, DEBUG ONLY, just log sendSmtpEmail
      console.log("sendSmtpEmail:", sendSmtpEmail);

      //const response = await this.apiInstance.sendTransacEmail(sendSmtpEmail);
      const response = "email virtually sent;"
      
      logger.info("Email sent successfully:", response);
      return true;
    } catch (err) {
      logger.error("Error sending email:", err);
      throw err;
    }
  }

  renderTemplate(templateName, locale, data) {
    // set the locale for this rendering
    i18n.changeLanguage(locale);
  
    // load the template file
    try {
      const templateContent = this.readTemplate(templateName); 
      //console.log("template content:", templateContent);
    
      return ejs.render(templateContent, {
        t: i18n.t.bind(i18n),
        ...data
      });
    } catch (err) {
      logger.error(`Error reading template ${templateName}:`, err);
      throw err;
    }
  }

  /**
   * reads a template from file system
   * 
   * @param {string} name - the template name
   * @returns {string} the template contents
   */
  readTemplate(name) {
    try {
      const templatePath = path.join(__dirname, config.email.templatesPath, name + config.email.templatesExtension);
      return fs.readFileSync(templatePath, { encoding: "utf-8" });
    } catch (err) {
      logger.error(`Error reading template file name ${name}:`, err);
      throw err;
    }
  }
};


module.exports = new EmailService();
