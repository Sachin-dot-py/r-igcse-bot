FROM oven/bun:debian

RUN apt-get update && apt-get install -y python3 && apt-get install -y build-essential

WORKDIR /usr/src/app

COPY . .

RUN bun install --frozen-lockfile

CMD [ "bun", "run", "start" ]