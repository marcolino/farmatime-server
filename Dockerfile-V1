# syntax = docker/dockerfile:1

# adjust node and yarn versions as desired (use the versions installed locally)
ARG NODE_VERSION=18.16.0

# import VM from a node slim as base
FROM node:${NODE_VERSION}-slim AS base
LABEL fly_launch_runtime="Node.js"

# node.js app lives here
WORKDIR /app

# initialize Yarn project
ARG YARN_VERSION=4.6.0
RUN yarn set version ${YARN_VERSION}

# throw-away build stage to reduce size of final image
FROM base AS build

# install packages needed to build node modules
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y \
    build-essential node-gyp pkg-config python-is-python3 curl dnsutils && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# install yarn dependencies
COPY --link .yarnrc.yml package.json yarn.lock ./
RUN yarn install --immutable

# copy application code
COPY --link . .

# final stage for app image
FROM base

# install runtime dependencies (including curl) in the final stage
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y curl dnsutils && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# copy built application from the build stage
COPY --from=build /app /app

# expose the server port (using .env.PORT)
EXPOSE ${PORT}

# start the server by default (can be overwritten at runtime)
CMD [ "yarn", "run", "start" ]