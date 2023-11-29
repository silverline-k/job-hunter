FROM node:18.9

WORKDIR /usr/src/app

COPY package*.json ./

RUN apt update
RUN npm install

