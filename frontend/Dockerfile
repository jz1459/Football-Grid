FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# App code (so dev server can serve it)
COPY . .

EXPOSE 3000

# Listen on all interfaces so host can reach it; disable opening browser in container
ENV HOST=0.0.0.0
ENV PORT=3000
ENV BROWSER=none
ENV CI=true

CMD ["npm", "start"]
