// smart-preview.js
const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../src/templates'));

// Function to read CSS file
function getBaseCSS(styleName) {
  try {
    const cssPath = path.join(__dirname, `../src/templates/styles/${styleName}.css`);
    let css = fs.readFileSync(cssPath, 'utf8');
    //css = `body::before { content: ''; display: block; height: 40px !important; }\n` + css;
    css = `body { padding-top: 20px !important; }\n` + css;
    return css;
  } catch (err) {
    console.warn('Could not read base.css, using empty styles:', err);
    return '/* base.css not found */';
  }
}

// List all available templates
app.get('/', (req, res) => {
  const templatesDir = path.join(__dirname, '../src/templates/');
  const files = fs.readdirSync(templatesDir).filter(file => file.endsWith('.ejs'));
  
  let html = '<h1>Available EJS Templates</h1><ul>';
  files.forEach(file => {
    const templateName = file.replace('.ejs', '');
    html += `<li><a href="/preview/${templateName}">${file}</a></li>`;
  });
  html += '</ul>';
  
  res.send(html);
});

// Preview individual template with common variables
app.get('/preview/:template', (req, res) => {
  const commonVariables = {
    sys_company_name: 'Farmatime',
    sys_company_logo: 'https://farmatime.it/logo-main-header.png',
    sys_company_title: 'FarmaTime',
    sys_company_mailto: 'posta@farmatime.it',
    sys_company_copyright: '© FarmaTime',
    sys_client_email_unsubscribe_link: 'https://farmatime.it/email-unsubscribe',
    sys_client_email_preferences_link: 'https://farmatime.it/email-preferences',
    sys_style: getBaseCSS('base'),
    sys_language: 'en',
    title: 'Template Preview',
    userFirstName: 'Marco',
    userLastName: 'Solari',
    notificationToken: 'dummy-token-123',
    body: '... BODY ...',
    t: function(msg) {
      return msg;
    },
    ...req.query // Allow overriding via query params
  };
  
  try {
    res.render(req.params.template, commonVariables);
  } catch (error) {
    res.send(`Error rendering template: ${error.message}`);
  }
});

app.listen(3000, () => {
  console.log('Smart EJS Preview server running at http://localhost:3000');
});