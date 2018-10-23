FROM node:8.11.3-jessie

RUN mkdir /opt/api
COPY . /opt/api
WORKDIR /opt/api

RUN apt-get dist-upgrade
RUN apt-get update
RUN npm config set always-auth true;
RUN apt-get install -y build-essential libssl-dev
RUN npm install node

#--unsafe-perm=true --allow-root
ARG DATABASE_IP
ARG DATABASE_PORT

ENV DATABASE_IP ${DATABASE_IP}
ENV DATABASE_PORT ${DATABASE_PORT}

EXPOSE 6000
CMD [ "index.js" ]
ENTRYPOINT ["node"]
