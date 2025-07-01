# Use a Node image that includes Corepack (Node 16.9+, 18+, 20+)
FROM node:20

# Enable and prepare Corepack (which manages Yarn 4+)
RUN corepack enable
RUN corepack prepare yarn@4.6.0 --activate

# Set working directory
WORKDIR /app

# Copy and install dependencies
COPY . .

# Use Yarn 4 with --immutable for reproducibility
RUN yarn install --immutable

## Build your app (optional)
#RUN yarn build

# Start your app (example)
CMD ["yarn", "start"]