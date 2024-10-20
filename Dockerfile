FROM oven/bun:debian

RUN apt-get update && apt-get install -y python3 && apt-get install -y build-essential

WORKDIR /app

COPY . /app

RUN bun install --production

CMD ["bun", "run", "start"]