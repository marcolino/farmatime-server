# syntax = docker/dockerfile:1

# adjust NODE_VERSION as desired
ARG NODE_VERSION=18.16.0
FROM node:${NODE_VERSION}-slim AS base

LABEL fly_launch_runtime="Node.js"

# node.js app lives here
WORKDIR /app

# set production environment (TODO: use .env.NODE_ENV)
ENV NODE_ENV="production"

# # install yarn
# RUN corepack enable && \
#     yarn set version ${YARN_VERSION}

# install Yarn globally and set the version to Berry (latest stable, currently 4.x)
#RUN npm --force install -g yarn

# initialize Yarn project
ARG YARN_VERSION=3.6.1
RUN yarn set version ${YARN_VERSION}

# throw-away build stage to reduce size of final image
FROM base AS build

# install packages needed to build node modules
RUN \
apt-get update -qq && \
apt-get install --no-install-recommends -y \
build-essential node-gyp pkg-config python-is-python3

# install node modules
COPY --link .yarnrc.yml package.json yarn.lock ./
RUN yarn install --immutable

# copy application code
COPY --link . .

# final stage for app image
FROM base

# copy built application
COPY --from=build /app /app

# expose the server port (TODO: use .env.PORT)
EXPOSE 5000
#EXPOSE ${PORT}

# start the server by default (can be overwritten at runtime)
CMD [ "yarn", "run", "start" ]
