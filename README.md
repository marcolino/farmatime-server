[![GitHub package.json version](https://img.shields.io/github/package-json/v/marcolino/acme-server?style=flat)](version)
[![GitHub package.json license](https://img.shields.io/github/package-json/license/marcolino/acme-server?style=flat)](license)
[![Mocha tests ok](https://github.com/marcolino/acme-server/blob/main/public/badges/mocha.svg)](tests)

[acme-server](https://github.com/marcolino/acme-server/) is an open‑source server side project for a general-purpose web app implementing a generic SAAS.

acme-server ...

# Tests Coverage
[Mocha unit+e2e tests coverage](https://marcolino.github.io/acme-server/coverage/index.html) 

# Features

acme-server provides the following features:

- Production-ready APIs
- Data Model
- Role Based Access Control (RBAC)
- Microservices Support
- Continuous GitHub Sync
- TypeScript and Node.js Source Code
- Plugin System
- Monorepo or Polyrepo
- Custom Code
- Admin UI
- acme-server Console & CLI

# Dependencies

## for the server:
 - node
 - git-crypt
 - python

## for the client
 - yarn
 - python


# Getting Started

You can get started with acme-server immediately on the acme-server Cloud. 

Alternatively you can set up a local development environment.

See the [acme-server Website](http://acme-server.com/) or [acme-server Docs](http://docs.acme-server.com/) for more details.

## Tutorials 

- [To-do Application using acme-server and React](https://docs.acme-server.com/tutorials/react-todos/)

## acme-server Cloud (SaaS)

Launch acme-server from [app.acme-server.com](http://app.acme-server.com/)

## Development Environment (Local)

### System Requirements

:bulb: Before you begin, make sure you have the following installed:

- [Node.js v16 or above](https://nodejs.org/en/download/)
- [Docker](https://docs.docker.com/desktop/)
- [Git](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git/)

### Getting Started With Local Development

acme-server is using a monorepo with multiple apps and libraries.

Follow these simple instructions to set up a local development environment.

1. Clone the repository and install dependencies:

  ```bash
  git clone https://github.com/marcolino/acme-server.git
  cd acme-server
  npm install
  ```

2. Run the [setup script](https://github.com/acme-server/acme-server/blob/master/scripts/setup.ts), which takes care of installing dependencies, building packages and ensuring your workspace is dev-ready.

  ```bash
  npm run setup:dev
  ```

3. Spin up all required infrastructure (Postgres, Kafka, etc.) using Docker Compose:

  ```bash
  # To be able to view logs
  npm run docker:dev

  # Or, if you prefer to run it at the background
  npm run docker:dev -- -d
  ```

4. Apply database migrations:

  ```bash
  npm run db:migrate:deploy
  ```

5. To start developing, run the `serve` target of the desired app:

  ```bash
  # This will serve the acme-server Server in development mode
  yarn start-dev 
  ```

+ **Please note that in order to be able to run the app's client properly, you need to `serve-dev` both the server and client.**

That's it, you are good to go! Happy hacking! 👾

### Setting Up acme-server Manually

You can use a manual step-by-step approach to set up acme-server in a local development environment. To do so, you should follow the following instructions for **Setting Up acme-server Server**, and **Setting Up acme-server Client**.

#### Setting up [acme-server Server](https://github.com/acme-server/acme-server/blob/master/packages/acme-server-server/README.md)

acme-server Server is the main component of the platform that provides all the core functionality to design and create low-code applications.
The server exposes a REST API for all actions. The server is built with the following awesome open-source technologies: Node.js, and many more...

#### Setting Up [acme-server Client](https://github.com/acme-server/acme-server/blob/master/packages/acme-server-client/README.md)

acme-server Client is the front end of the platform that provides you with an easy-to-drive UI for building your next low-code application.
The client is based on React, React Material Web Components, Formik, and more.

# Version 1

acme-server is currently in version 1. This is the first major release of acme-server with enterprise-grade production readiness & scale. In this version, we have introduced multiple new features and enhanced the existing ones. The feature set is listed above in the [Features](#features) section.

## Support

Ask your questions and participate in discussions regarding acme-server-related and web-dev topics at the acme-server github project page.

## Create a Bug Report

If you see an error message or run into an issue, please [create bug report](https://github.com/acme-server/acme-server/issues/new?assignees=&labels=type%3A+bug&template=bug.yaml&title=%F0%9F%90%9B+Bug+Report%3A+). This effort is valued and helps all acme-server users.


## Submit a Feature Request

If you have an idea, or you're missing a capability that would make development easier and more robust, please [Submit feature request](https://github.com/acme-server/acme-server/issues/new?assignees=&labels=type%3A+feature+request&template=feature.yml).

If a similar feature request already exists, don't forget to leave a "+1".
If you add some more information such as your thoughts and vision about the feature, your comments will be embraced warmly :)


# Contributing

acme-server is an open-source project. We are committed to a fully transparent development process and highly appreciate any contributions. Whether you are helping us fix bugs, proposing new features, improving our documentation or spreading the word - we would love to have you as a part of the acme-server community.

Please refer to our [Contribution Guidelines](./CONTRIBUTING.md) and [Code of Conduct](./CODE_OF_CONDUCT.md).

# Contributors ✨

Thanks goes to these wonderful people ([:hugs:](https://allcontributors.org/docs/en/emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tbody>
    <tr>
      <td align="center"><a href="https://github.com/marcolino"><img src="https://avatars.githubusercontent.com/u/849127?v=4?s=100" width="100px;" alt="Marco Solari"/><br /><sub><b>Marco Solari</b></sub></a><br /><a href="https://github.com/marcolino/acme-server/commits?author=marcolino" title="Code">💻</a></td>
    </tr>
  </tbody>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind welcome!
