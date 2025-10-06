const fs = require("fs");
const path = require("path");
const Brevo = require("sib-api-v3-sdk");
const ejs = require("ejs");
const { inline } = require("@css-inline/css-inline");
//const User = require("../models/user.model");
const NotificationToken = require("../models/notificationToken.model");
const { logger } = require("../controllers/logger.controller");
const i18n = require("../middlewares/i18n");
const config = require("../config");

// The email service class
class EmailService {
  constructor() {
    this.apiInstance = null;
    this.systemPlaceholders = {
      sys_company_name: config.app.company.name,
      sys_company_title: config.app.company.title,
      sys_company_mailto: config.app.company.email,
      sys_company_copyright: config.app.company.copyright,
      sys_company_logo: `${config.baseUrlPublic}/logo-main-header.png`,
      sys_company_support_mailto: config.email.support.to,
      sys_client_email_unsubscribe_link: config.clientEmailUnsubscribeUrl,
      sys_client_email_preferences_link: config.clientEmailPreferencesUrl,
    };
  }

  // Setup method to configure the Brevo API client
  async setup(apiKey) {
    return new Promise((resolve, reject) => {
      try {
        // configure API key authorization api-key
        Brevo.ApiClient.instance.authentications["api-key"].apiKey = apiKey;

        // create transactional emails api instance 
        this.apiInstance = new Brevo.TransactionalEmailsApi();
        resolve(); // resolve the promise when setup is successful
      } catch (err) {
        logger.error("Error during setup of email service:", err);
        reject(err); // reject the promise if setup fails
      }
    });
  }

  /**
   * Method to send an email with HTML content
   * 
   * @param {string} to - the recipient's email address (mandatory)
   * @param {string} subject - the subject of the email (mandatory)
   * @param {string} [toName] - the recipient's name (optional)
   * @param {string} [from] - the senders's address (optional)
   * @param {string} [fromName] - the senders's name (optional)
   * @param {string} body - the HTML "email-body" of the email
   * @returns {boolean} a boolean value that indicates if email was sent correctly
   */
  async send(req, params) {
    try {
      if (!this.apiInstance) {
        throw new Error(req.t("Email service is not initialized, please setup first")); 
      }
      
      if (!params) params = {};
      if (!params.to) return logger.error("Parameter 'to' is mandatory to send email");
      if (!params.subject) return logger.error("Parameter 'subject' is mandatory to send email");
      if (!params.htmlContent) return logger.error("Parameter 'htmlContent' is mandatory to send email");
      if (!params.toName) params.toName = null;
      if (!params.from) params.from = config.email.from;
      if (!params.fromName) params.fromName = config.email.fromName;
      if (!params.replyTo) params.replyTo = ""; 
      if (!params.replyToName) params.replyToName = "";

      if (typeof params.to === "string") params.to = [params.to]; // accept also a single string with an email

      const modeSymbol =
        config.mode.development ? "🚧" :
          config.mode.staging ? "🌐" :
            config.mode.production ? "" : //"🚀" :
              "�"
        // eslint-disable-line indent -- unforeseen mode
      ;
      const htmlContent = params.htmlContent;

      // create smtp email object
      let sendSmtpEmail = new Brevo.SendSmtpEmail();
      const to = params.to.map(email => ({ email }));
      sendSmtpEmail = {
        to,
        sender: {
          email: params.from,
          name: params.fromName,
        },
        ...(params.replyTo ? {
          replyTo: {
            email: params.replyTo,
            name: params.replyToName,
          },
        } : {}),
        subject: modeSymbol + ' ' + params.subject,
        htmlContent,
        ...(params.tags ? { tags: params.tags } : {}),
      };
      logger.info(`sendSmtpEmail:`, `to: ${sendSmtpEmail.to[0].email}, sender: ${sendSmtpEmail.sender.email}`, `subject: ${sendSmtpEmail.subject}`);

      // if requested in config.email.dryrun, skip real email send, just log sendSmtpEmail
      let response;
      if (config.email.dryrun) {
        response = {}; response.messageId = "virtual-send-message-id";
      } else {
        response = await this.apiInstance.sendTransacEmail(sendSmtpEmail);
      }
      
      logger.info(`Email sent to ${params.to} with message id ${response.messageId}, response was:`, response);
      return response;
    } catch (err) {
      // logger.error(`Error sending email to ${params.to}:`, err);
      // throw err;
      const message = err.message + (err?.response?.body?.message ? ` (${err.response.body.message})` : '');
      throw new Error(`Error sending email to ${params.to}: ${message}`);
    }
  }

  /**
   * Method to send an email with HTML content, and possibly a template
   * 
   * @param {string} to - the recipient's email address (mandatory)
   * @param {string} subject - the subject of the email (mandatory)
   * @param {string} [toName] - the recipient's name (optional)
   * @param {string} [from] - the senders's address (optional)
   * @param {string} [fromName] - the senders's name (optional)
   * @param {string} body - the HTML "email-body" of the email
   * @param {object} templateName - the filename of a file fith htmlContent (optional)
   * @param {object} templateParams - an object with params (key: value) to be substituted in htmlContent (optional)
   * @returns {boolean} a boolean value that indicates if email was sent correctly
   * 
   * Note: htmlContent and templateName parameters are alternative
   */
  async sendWithTemplate(req, params) {
    try {
      if (!this.apiInstance) {
        throw new Error(req.t("Email service is not initialized, please setup first"));
      }

      let notificationToken;
      if (req && req.user) {
        try {
          notificationToken = await NotificationToken.createToken(req.user, "email");
        } catch (err) {
          const message = `Error creating email notification token: ${err.message}`;
          logger.error(message);
          throw new Error(message);
        }
      } else {
        notificationToken = null;
      }
      
      if (!params) params = {};
      if (!params.to) return logger.error("Parameter 'to' is mandatory to send email");
      if (!params.subject) return logger.error("Parameter 'subject' is mandatory to send email");
      if (!params.toName) params.toName = null;
      if (!params.from) params.from = config.email.from;
      if (!params.fromName) params.fromName = config.email.fromName;
      if (!params.templateName) params.templateName = "base";
      if (!params.templateParams) params.templateParams = {};
      if (!params.templateParams.style) params.templateParams.style = "base";
      params.templateParams.notificationToken = notificationToken; // used to allow authenticate users who click on back reference links in emails
      
      if (typeof params.to === "string") params.to = [params.to]; // accept also a single string with an email

      let htmlContent;
      if (params.htmlContent) { // use this as htmlContent, and avoid templates
        htmlContent = params.htmlContent;
      } else {
        const language = req?.language ?? config.app.serverLocale;

        // add language and dir from request
        params.templateParams.sys_language = language;

        // add system placeholders to template params
        params.templateParams = { ...params.templateParams, ...this.systemPlaceholders };

        // add system style
        params.templateParams.sys_style = this.readTemplateStyle(params.templateParams.style);
        delete params.templateParams.style;

        if (params.body) {
          params.templateParams.body = params.body;
          delete params.body;
        }

        // render template to htmlContent, with templateName, templateParams and language
        htmlContent = this.renderTemplate(params.templateName, params.templateParams, language);
      }

      // create smtp email object
      let sendSmtpEmail = new Brevo.SendSmtpEmail();
      const to = params.to.map(email => ({ email }));
      sendSmtpEmail = {
        to,
        sender: {
          email: params.from,
          name: params.fromName,
        },
        subject: params.subject,
        htmlContent,
      };
   
      // if requested in config.email.dryrun, skip real email send, just log sendSmtpEmail
      let response;
      if (config.email.dryrun) {
        response = {}; response.messageId = "virtual-send-message-id";
      } else {
        response = await this.apiInstance.sendTransacEmail(sendSmtpEmail);
      }
      
      logger.info(`Email sent to ${params.to} with message id ${response.messageId}`);
      return true;
    } catch (err) {
      logger.error(`Error sending email to ${params.to}:`, err);
      throw err;
    }
  }

  renderTemplate(templateName, templateParams, locale) {
    i18n.changeLanguage(locale); // set the locale for this rendering
  
    try {
      // load the template file
      const templateContent = this.readTemplate(templateName);

      /**
       * detect template variables missing in templateParams
       *  - simple variable name: <%= variableName %>
       *  - string to be translated: <%= t("stringToBeTranslated") %>
       *  - string to be translated with params: <%= t("stringToBeTranslated {{name}}, {{surname}}", {name, surname}) %>
       */
      const regex = /<%[-=]\s?([\s\S]+?)\s?%>/g; // ejs variables regex
      const regexVariable = /\b[a-zA-Z_$][0-9a-zA-Z_$]*\b/g; // ejs variable names regex
      const regexI18n = /\bt\(\s*['"]/; // ejs translations regex
      const regexI18nVariable = /([a-zA-Z_$][0-9a-zA-Z_$]+)\s*:\s*([a-zA-Z_$][0-9a-zA-Z_$]+)\s*[,}]/g; // ejs translations variables regex

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

      // detect template variables missing in template params
      const missingVariables = Array.from(templateVariables).filter(variable => !(variable in templateParams));
      if (missingVariables.length > 0) {
        throw new Error(`The following variables are used in template "${templateName}" but not provided in template params: ${missingVariables}`);
      } else {
        //logger.info("All variables used in template are provided in template params");
      }
    
      // detect if template params variables are in excess respect to template (excluding system variables)
      const excessVariables = Object.keys(templateParams).filter(variable => !variable.startsWith("sys_")).filter(variable => !Array.from(templateVariables).includes(variable));
      if (excessVariables.length > 0) {
        throw new Error(`The following variables are provided in template params but not used in template "${templateName}": ${excessVariables}`);
      } else {
        //logger.info("All variables provided in template params are used in the template");
      }

      const templateContentRendered = ejs.render(templateContent, {
        t: i18n.t.bind(i18n),
        ...templateParams,
      });

      // inline css styles
      const templateContentRenderedInlined = inline(templateContentRendered);

      //console.log("templateContentRenderedInlined:", templateContentRenderedInlined);
      return templateContentRenderedInlined;
    } catch (err) {
      throw new Error(err.message);
    }
  }

  /**
   * Read a template from file system
   * 
   * @param {string} name - the template name
   * @returns {string} the template contents
   */
  readTemplate(name) {
    try {
      const templatesPath = path.join(__dirname, config.email.templatesPath, name + config.email.templatesExtension);
      return fs.readFileSync(templatesPath, { encoding: "utf-8" });
    } catch (err) {
      logger.error(`Error reading template file name ${name}:`, err);
      throw err;
    }
  }

  /**
   * Read a template style from file system
   * 
   * @param {string} name - the template style name
   * @returns {string} the template style contents
   */
  readTemplateStyle(name) {
    try {
      const templatesPath = path.join(__dirname, config.email.templatesPath, "styles", name + ".css");
      return fs.readFileSync(templatesPath, { encoding: "utf-8" });
    } catch (err) {
      logger.error(`Can't read template style file name ${name}:`, err);
      return null;
    }
  }
}

module.exports = new EmailService();
