<div align="center">
    <img alt="logo" src="https://i.imgur.com/y61hkqf.png" height="128px" />
    <h1>r/IGCSE</h1>
</div>

---

r/IGCSE Bot is a Python Discord Bot primarly developed for the [r/IGCSE Discord Community](https://discord.gg/igcse) but also used by 100+ other servers. This bot provides a rep system & leaderboard, server suggestions voting, keyword auto-replies, moderation actions automatically updating your logging channel, reaction roles, and more!

[Add r/IGCSE Bot to your Discord Server](https://discord.com/api/oauth2/authorize?client_id=861445044790886467&permissions=8&scope=bot).

The `v1.0` version of this bot, written in Python, rolled into use on July 5, 2021 and has come a long way since.

The `v2.0` version of this bot, entirely re-written in TypeScript, was released on March 22, 2024.

The bot is currently hosted on Oracle Cloud Infrastructure.

# Contributors

The contributors to the `v2.0` release are attributed below. <a href="https://github.com/11xdeveloper">Dawood</a> and <a href="https://github.com/chirag350">Chirag</a> were the primary authors of the TypeScript rewrite.

<a href="https://github.com/Sachin-dot-py/r-igcse-bot/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=Sachin-dot-py/r-igcse-bot" />
</a>

# Preview of Features

-   Rep System (Leaderboard displaying the top Helpers in the community)
<div align="center">
    <img align="center" alt="Image" src="https://github.com/Sachin-dot-py/r-IGCSEBot/assets/61686882/09a27ee5-4cc3-41b5-8f0e-999f5edfa238" width="60%">
</div>

<br/>

-   Past Paper Keyword Search (Allows members to perform keyword searches to retrieve IGCSE Past Papers)
<div align="center">
    <img align="center" width="60%" alt="Image" src="https://github.com/Sachin-dot-py/r-IGCSEBot/assets/61686882/c9267594-d4ec-4bc6-acb4-050d5271a19e">
</div>

<br/>

-   Provide Convenient Access to Granting Server Roles (e.g. Subject Roles)
<div align="center">
    <img align="center" width="60%" alt="Image" src="https://github.com/Sachin-dot-py/r-IGCSEBot/assets/61686882/ee932b39-988a-4c11-8f6f-3288f433c425">
</div>

<br/>

-   Moderation System (Enables moderators to warn/timeout/kick/ban users not abiding by the rules)
<div align="center">
    <img align="center" alt="Image" src="https://github.com/Sachin-dot-py/r-IGCSEBot/assets/61686882/42f49852-565c-4ad5-8044-bd713ddb5720" width="60%">
</div>

<br/>

-   Suggestion System (Allow members to vote on and suggest new ideas for the community)
<div align="center">
    <img align="center" alt="Image" src="https://github.com/Sachin-dot-py/r-IGCSEBot/assets/61686882/e604eb40-f007-4554-a510-8f6c5691bb4c" width="60%">
</div>

<br/>

-   Easy Creation of Simple & Complex Polls
<div align="center">
    <img align="center" width="60%" alt="Image" src="https://github.com/Sachin-dot-py/r-IGCSEBot/assets/61686882/3d2e62b4-a129-4a72-9719-9545ff96e8da">
</div>

<br/>

-   Anti-Spam System (Automatically detect spam links and timeout the sender)
<div align="center">
    <img align="center" alt="Image" src="https://github.com/Sachin-dot-py/r-IGCSEBot/assets/61686882/1c1ff9f0-2ce4-4703-ad78-35c8f5be00f5" width="60%">
</div>

<br/>

-   Helper Ping System (Automatically notifying Subject Helpers of unanswered questions after 15 minutes)
<div align="center">
    <img align="center" alt="Image" src="https://github.com/Sachin-dot-py/r-IGCSEBot/assets/61686882/ca5af6f6-929d-4861-9bca-aa954a023964" width="60%">
</div>

<br/>

-   Create Informational Embeds to assist Server Moderators
<div align="center">
    <img align="center" width="60%" alt="Image" src="https://github.com/Sachin-dot-py/r-IGCSEBot/assets/61686882/d37b53e3-3de3-4b10-8eb5-25681c4341b4">
</div>

<br/>

-   Provide Convenient Direct Access to Available Resources
<div align="center">
    <img align="center" width="60%" alt="Image" src="https://github.com/Sachin-dot-py/r-IGCSEBot/assets/61686882/8a4a74d2-e183-4c3f-bbf8-acc3bc2827f5">
</div>

<br/>

# Local Installation Guide

1. [Make sure you have Python 3.7+ installed (preferably 3.12.1)](https://www.python.org/downloads/source/)
2. Install the requirements (`pip install -r requirements.txt`)
3. [Generate a Discord Bot API Token](https://www.writebots.com/discord-bot-token/)
4. [Create a MongoDB database named `IGCSEBot`](https://www.mongodb.com/basics/create-database).
5. [Setup redis and get your REDIS_OM_URL](https://github.com/redis/redis-om-python/blob/main/docs/getting_started.md)
6. Rename `.env.example` to `.env` and fill it in with the above
7. Run the bot using the command `python src/app.py` (`python3 src/app.py` for Linux) or run the npm `start` script
