# FROM node:lts-alpine AS build-stage
FROM node:lts-alpine
WORKDIR /usr/src/app/

RUN apk add --update --no-cache curl py-pip g++ make

COPY package.json yarn.lock ./

RUN yarn install --ignore-scripts
RUN yarn add mmmagic
RUN yarn global add pm2

COPY . .

RUN yarn build:prod

# FROM node:lts-alpine AS install-dependencies-stage
# WORKDIR /usr/src/app/
# COPY package.json yarn.lock ./

# RUN yarn install --prod --ignore-scripts

# Run-time stage
# FROM node:lts-alpine AS run-stage
# USER node
ARG PORT=3000

# WORKDIR /usr/src/app/

# COPY --from=build-stage /usr/src/app/dist ./dist
# COPY --from=install-dependencies-stage /usr/src/app/node_modules ./node_modules
# COPY *.json /usr/src/app/

EXPOSE $PORT

CMD [ "pm2-runtime", "dist/main.js" ]
# CMD [ "yarn", "start:prod" ]
# CMD [ "tail","-f" ,"/dev/null" ]
