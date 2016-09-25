# A Docker image to run the todo list example
FROM node:5

# Get needed libraries
RUN apt-get update
RUN apt-get install -y libelf1

# Create node user
RUN groupadd node && useradd -m -g node node
WORKDIR /home/node/async-dispatcher/
RUN chown node:node ./

# Get async-dispatcher files
COPY ./.flowconfig ./.flowconfig
COPY ./.babelrc ./.babelrc
COPY ./package.json ./package.json
COPY ./type.js ./type.js
COPY ./src ./src
COPY ./__tests__ ./__tests__
COPY ./example ./example
RUN chown -R node:node ./*

# Run tests
USER node
RUN npm install
#CMD npm run test

# Start example
WORKDIR /home/node/async-dispatcher/example/
RUN npm install
CMD npm start

EXPOSE 8080
