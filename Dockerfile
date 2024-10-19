FROM oven/bun:latest

COPY . /app

WORKDIR /app

RUN bun install

CMD ["bun", "run", "start"]

