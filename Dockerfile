FROM oven/bun:1

COPY . /app

WORKDIR /app

RUN bun install

CMD ["bun", "run", "start"]

