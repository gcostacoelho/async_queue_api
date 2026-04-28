FROM node:25-alpine3.22 AS api
WORKDIR /usr/app

COPY package*.json .

RUN npm install

COPY . .

EXPOSE 3000

CMD [ "npm", "start" ]


FROM node:25-alpine3.22 AS worker
WORKDIR /usr/app

COPY package*.json .

RUN npm install

COPY . .

CMD [ "npm", "run" ,"worker" ]