# WORK IN PROGRESS
### Please come back soon

<br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/>

[![GitHub package.json version](https://img.shields.io/github/package-json/v/marcolino/med-server?style=flat)](version)
[![GitHub package.json license](https://img.shields.io/github/package-json/license/marcolino/med-server?style=flat)](license)

<!--[![Mocha tests ok](https://github.com/marcolino/med-server/blob/main/public/badges/mocha.svg)](tests)-->
<!--![Test Status](https://github.com/marcolino/med-server/actions/workflows/test.yml/badge.svg)-->
![Tests Passed](https://img.shields.io/badge/tests%20passed-376-brightgreen)
![GitHub last commit](https://img.shields.io/github/last-commit/marcolino/med-server)
![GitHub forks](https://img.shields.io/github/forks/marcolino/med-server?style=social)
![GitHub contributors](https://img.shields.io/github/contributors/marcolino/med-server)
![Maintenance](https://img.shields.io/maintenance/yes/2025)
![GitHub issues](https://img.shields.io/github/issues/marcolino/med-server)
![GitHub pull requests](https://img.shields.io/github/issues-pr/marcolino/med-server)
![GitHub repo size](https://img.shields.io/github/repo-size/marcolino/med-server)

![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/marcolino/med-server/ci.yml?branch=main)
![Known Vulnerabilities](https://snyk.io/test/github/marcolino/med-server/badge.svg)

![React](https://img.shields.io/badge/react-18.2.0-blue?logo=react)
![Express](https://img.shields.io/badge/express-4.17.1-lightgrey?logo=express)
![MongoDB](https://img.shields.io/badge/mongoDB-4.4-green?logo=mongodb)

# Summary
[med-server](https://github.com/marcolino/med-server/) is the server side of an open‑source project for a general-purpose web app implementing a showcase site , with optional ecommerce (currently using Stripe service for payments), users authentication and handling.
It is strictly coupled with [med-client](https://github.com/marcolino/med-client/), the client project.

# Features
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
- med-server Console & CLI


# Technology
  ### on the server:
  - node.js
  ### on the client:
  - ...


# Services


# Dependencies


## For the server:
 - node.js
 - npm
 - git-crypt

## For the client
 - npm

> Note: for tests we depend on chai 4.*, because it is the last version compatible with CommonJS, and the whole project is CommonJS.


# Installation
 - npm install -g yarn
 - yarn
...


# Configuration

 - Copy .env.template to .env, and insert all keys values; if you prefer to use different services, felle free to change corresponding keys, and relevant code too.
 - Use `scripts/githubUploadSecrets.js` to upload .env secrets to github, so that github actions can complete.


# Tests Coverage
[Mocha unit+e2e tests coverage](https://marcolino.github.io/med-server/coverage/index.html) 


# Getting Started

You can get started with med-server immediately on the med-server Cloud. 

Alternatively you can set up a local development environment.

See the [med-server Website](http://med-server.com/) or [med-server Docs](http://docs.med-server.com/) for more details.


## Tutorials 

- [To-do Application using med-server and React](https://docs.med-server.com/tutorials/react-todos/)


## med-server Cloud (SaaS)

Launch med-server from [med-preod.fly.dev](https://med-preod.fly.dev/)


## Development Environment (Local)


### System Requirements

:bulb: Before you begin, make sure you have the following installed:

- [Node.js v16 or above](https://nodejs.org/en/download/)
- [Docker](https://docs.docker.com/desktop/)
- [Git](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git/)


### Getting Started With Local Development

med-server is using a monorepo with multiple apps and libraries.

Follow these simple instructions to set up a local development environment.

1. Clone the repository and install dependencies:

  ```bash
  git clone https://github.com/marcolino/med-server.git
  cd med-server
  yarn install
  ```

2. Run the [setup script](https://github.com/med-server/med-server/blob/master/scripts/setup.js), which takes care of installing dependencies, building packages and ensuring your workspace is dev-ready.

  ```bash
  yarn setup:dev
  ```

3. Spin up all required infrastructure (Postgres, Kafka, etc.) using Docker Compose:

  ```bash
  # To be able to view logs
  yarn docker:dev

  # Or, if you prefer to run it in background
  yarn docker:dev -- -d
  ```

4. Apply database migrations:

  ```bash
  yarn db:migrate:deploy
  ```

5. Setup environment

  After cloning the repo, original environment secrets will be downloaded too, in ./.env file.
  You can delete it, it is the environment secrets of the owner, who has the key to unencrypt it.
  Then, if you don't have it, install git-crypt (on Linux (Debian/Ubuntu): `sudo apt-get install git-crypt`),
  and then initialize it in your repo: `git-crypt init`.
  Please copy the generated key to some safe folder or device: `git-crypt export-key /SAFE-DEVICE/git-crypt-key`.
  Now please copy .env.template file to .env (it's the .env file with the keys and the comments, but without the values), and fill it up completely, following the comments; you'll have to set up passwords, or keys for services.
  The .env file is listed in .gitattributes, so it will be encrypted before being pushed to remote repository.
  Now, you will have your .env file clear text on your local machine, and encrypted on the remote.
  If you'll have to clone the repo in the future on a new machine, simply do `git-crypt unlock /SAFE-DEVICE/git-crypt-key`, and the .env file will be unencrypted.

6. To start developing, run the `start-dev` target of the desired app:

  ```bash
  # This will start the med-server Server in development mode
  yarn start-dev 
  ```

+ **Please note that in order to be able to run the app's client properly, you need to `yarn start-dev` both on the server and on client.**

That's it, you are good to go! Happy hacking! 👾


# Version 0.0.1

med-server is currently in version 0.0.1. This is the first major release of med-server with enterprise-grade production readiness & scale. In this version, we have introduced multiple new features and enhanced the existing ones. The feature set is listed above in the [Features](#features) section.


## Support

Ask your questions and participate in discussions regarding med-server-related and web-dev topics at the med-server github project page.


## Create a Bug Report

If you see an error message or run into an issue, please [create bug report](https://github.com/med-server/med-server/issues/new?assignees=&labels=type%3A+bug&template=bug.yaml&title=%F0%9F%90%9B+Bug+Report%3A+). This effort is valued and helps all med-server users.


## Submit a Feature Request

If you have an idea, or you're missing a capability that would make development easier and more robust, please [Submit feature request](https://github.com/med-server/med-server/issues/new?assignees=&labels=type%3A+feature+request&template=feature.yml).

If a similar feature request already exists, don't forget to leave a "+1".
If you add some more information such as your thoughts and vision about the feature, your comments will be embraced warmly.


# Contributing

med-server is an open-source project. We are committed to a fully transparent development process and highly appreciate any contributions. Whether you are helping us fix bugs, proposing new features, improving our documentation or spreading the word - we would love to have you as a part of the med-server community.

Please refer to our [Contribution Guidelines](./CONTRIBUTING.md) and [Code of Conduct](./CODE_OF_CONDUCT.md).


# Contributors ✨

Thanks goes to these wonderful people ([:hugs:](https://allcontributors.org/docs/en/emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tbody>
    <tr>
      <td align="center"><a href="https://github.com/marcolino"><img src="https://avatars.githubusercontent.com/u/849127?v=4?s=100" width="100px;" alt="Marco Solari"/><br /><sub><b>Marco Solari</b></sub></a><br /><a href="https://github.com/marcolino/med-server/commits?author=marcolino" title="Code">💻</a></td>
    </tr>
  </tbody>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind welcome!
