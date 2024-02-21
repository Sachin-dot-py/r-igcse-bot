type APIResponse = {
    error: false;
    category: JokeCategory;
    flags: {
        nsfw: false;
        religious: false;
        political: false;
        racist: false;
        sexist: false;
        explicit: false;
    };
    id: number;
    safe: true;
    lang: 'en';
} & (
    | { type: 'single'; joke: string }
    | { type: 'twopart'; setup: string; delivery: string }
);

export type JokeCategory =
    | 'Programming'
    | 'Misc'
    | 'Dark'
    | 'Pun'
    | 'Spooky'
    | 'Christmas';

export const getJoke = async (categories: JokeCategory[], amount = 1) => {
    const res = await fetch(
        `https://v2.jokeapi.dev/joke/${categories.join(',')}?blacklistFlags=nsfw,religious,political,racist,sexist,explicit&amount=${amount}`,
    );
    const data: APIResponse = await res.json();

    return data.type === 'single'
        ? data.joke
        : `${data.setup} ${data.delivery}`;
};
