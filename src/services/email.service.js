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
    this.systemPlaceholders = {
      "_.language": config.app.company.name,
      "_.company.name": config.app.company.name,
      "_.company.title": config.app.company.title,
      "_.company.mailto": config.app.company.mailto,
      "_.company.copyright": config.app.company.copyright,
      "_.company.logo": "http://localhost:5000/favicon.ico", // TODO: use a public image, after first deploy...
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

      params.templateParams.sys_language = req.language;
      params.templateParams.sys_company_name = config.app.company.name;
      params.templateParams.sys_company_title = config.app.company.title;
      params.templateParams.sys_company_mailto = config.app.company.mailto;
      params.templateParams.sys_company_copyright = config.app.company.copyright;
      params.templateParams.sys_company_logo = "http://localhost:5000/favicon.ico";

      // handle templates
      params.htmlContent = this.renderTemplate(params.templateFilename, req.language, params.templateParams);

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
   
      // send transactional email with sendSmtpEmail object
      logger.info("SMTP email:", JSON.stringify(sendSmtpEmail));

      // if requested in config.email.dryrun, skip real email send, just log sendSmtpEmail
      let response;
      if (config.email.dryrun) {
        response = {}; response.messageId = "virtual-send-message-id";
      } else {
        response = await this.apiInstance.sendTransacEmail(sendSmtpEmail);
      }
      
      logger.info("Email send:", response.messageId);
      return true;
    } catch (err) {
      logger.error("Error sending email:", err);
      throw err;
    }
  }

  renderTemplate(templateName, locale, data) {
    i18n.changeLanguage(locale); // set the locale for this rendering
  
    // load the template file
    try {
      const templateContent = this.readTemplate(templateName); 
    
      // detect template variables missing in data
      const regex = /<%=\s?([\s\S]+?)\s?%>/g; // ejs variables regex
      const regexVariable = /\b[a-zA-Z_$][0-9a-zA-Z_$]*\b/g;
      const regexI18n = /\bt\(\s*['"]/;
      const regexI18nVariable = /([a-zA-Z_$][0-9a-zA-Z_$]+)\s*:\s*([a-zA-Z_$][0-9a-zA-Z_$]+)\s*[,}]/g;

      let match;
      const templateVariables = new Set();
      while ((match = regex.exec(templateContent)) !== null) {
        const code = match[1].trim();
        
        // only apply the detailed variableRegex if the code is a translation string
        if (regexI18n.exec(code) !== null) {
          let varMatch;
          while ((varMatch = regexI18nVariable.exec(code)) !== null) {
            const variable = varMatch[2];
            templateVariables.add(variable);
          }
        } else {
          // use a simpler regex for other cases
          let varMatch;
          while ((varMatch = regexVariable.exec(code)) !== null) {
            const variable = varMatch[0];
            templateVariables.add(variable);
          }
        }
      }

      // detect template variables missing in data
      const missingVariables = Array.from(templateVariables).filter(variable => !(variable in data));
      if (missingVariables.length > 0) {
        throw new Error(`The following variables are used in the template but not provided in the data: ${missingVariables}`);
      } else {
        //logger.info("All variables used in template are provided in the data");
      }
    
      // detect if data variables are in excess respect to template
      const excessVariables = Object.keys(data).filter(variable => !Array.from(templateVariables).includes(variable));
      if (excessVariables.length > 0) {
        throw new Error(`The following variables are provided in data but not used in the template: ${excessVariables}`);
      } else {
        //logger.info("All variables provided in data are used in the template");
      }

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
