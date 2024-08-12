//const Brevo = require("@getbrevo/brevo");
const fs = require("fs");
const path = require("path");
const Brevo = require("sib-api-v3-sdk");
const { logger } = require("../controllers/logger.controller");
const config = require("../config");

// the email service class
class EmailService {
  constructor() {
    this.apiInstance = null;
    this.regexPlaceholder = /\$\{([A-Za-z0-9_@./#&+-]+)\}/g;
    this.systemPlaceholders = {
      "_.company.name": config.company.name,
      "_.company.title": config.company.title,
      "_.company.mailto": config.company.mailto,
      "_.company.copyright": config.company.copyright,
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
  async send(params) {
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

      // handle templates in files
      try {
        params.htmlContent = params.htmlContent = this.readTemplateFile(params.templateFilename);
      } catch (err) {
        logger.error(`Error reading template ${params.templateFilename}:`, err);
        throw err;
      }

      // handle templates
      try {
        params.htmlContent = this.substituteTemplateParams(params.htmlContent, params.templateParams);
      } catch (err) {
        logger.error("Error in parameters:", err);
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
      const response = await this.apiInstance.sendTransacEmail(sendSmtpEmail);
      console.info("Email sent successfully:", response);
      logger.info("Email sent successfully");
      return true;
    } catch (err) {
      logger.error("Error sending email:", err);
      throw err;
    }
  }

  /**
   * replaces placeholders in the template string with corresponding values from the parameters object
   * 
   * @param {string} template - the template string containing placeholders in the form of ${key}
   * @param {Object} params - an object containing key-value pairs to replace in the template
   * @returns {string} the formatted string with placeholders replaced by corresponding values
   */
  substituteTemplateParams(template, params) {
    if (typeof template !== "string") {
      throw new Error("Template must be a string");
    }
    if (typeof params !== "object" || params === null) {
      throw new Error("Params must be an object");
    }

    // replace placeholders using a function to access params
    return template.replace(this.regexPlaceholder, (match, placeholderName) => {
      // check if the placeholder exists in params
      // if (params.hasOwnProperty(placeholderName)) {
      //   return params[placeholderName]; // return the value for replacement
      // }
      let placeholders = null;
      if (params.hasOwnProperty(placeholderName)) { // look for placeholder name in the params, to start with
        placeholders = params;
      } else
      if (this.systemPlaceholders.hasOwnProperty(placeholderName)) { // then look for placeholder name in the system placeholders
        placeholders = this.systemPlaceholders;
      }
      if (!placeholders) {
        throw new Error(`Placeholder '${placeholderName}' not specified in parameters nor in system placeholders`);
      }
      return placeholders[placeholderName]; // return the value for replacement
      //return match; // return the original match if not found
    });

    // let match;
    // while ((match = this.regexPlaceholder.exec(template)) !== null) {
    //   const placeholder = match[0];
    //   //let startIndex = match.index;
    //   //let endIndex = startIndex + placeholder.length;
    //   //let placeholderName = placeholder.replace(/^\$\{/, "").replace(/\}$/, "");
    //   const placeholderName = match[1]; // get the name of the placeholder
    //   const placeholderValue = params[placeholderName];
    //   //console.log(`found ${placeholderName} start=${startIndex} end=${endIndex}`);
    //   let placeholders = null;
    //   if (params.hasOwnProperty(placeholderName)) { // look for placeholder name in the params, to start with
    //     placeholders = params;
    //   } else
    //   if (this.systemPlaceholders.hasOwnProperty(placeholderName)) { // then look for placeholder name in the system placeholders
    //     placeholders = this.systemPlaceholders;
    //   }
    //   if (!placeholders) {
    //     throw new Error(`Placeholder '${placeholderName}' not specified in parameters nor in system placeholders`);
    //   }

    //   template = template.replace(placeholder, placeholderValue); // replace in template
    // }
    // return template;
  }

  /**
   * reads a template from file system
   * 
   * @param {string} template - the template string containing placeholders in the form of ${key}
   * @param {Object} params - an object containing key-value pairs to replace in the template
   * @returns {string} the formatted string with placeholders replaced by corresponding values
   */
  readTemplateFile(name) {
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
