# Discord Economy Bot

A simple Discord economy bot (similar to UnbelievaBoat) for server-specific currency management. Built with Node.js and discord.js v14.

## Features

- Check balances (`/balance`)
- Transfer money between users (`/givemoney`)
- Paginated leaderboard (`/leaderboard`)
- Admin commands: add, remove, set, split, and reset money
- Role-based permission system
- JSON-based persistent data storage (`data/economy.json`)
- Keep-alive HTTP server with `/health` endpoint for uptime monitoring

## Architecture

- **Entry point**: `src/index.js` — initializes Discord client, registers slash commands, starts keep-alive HTTP server
- **Commands**: `src/commands/` — individual slash command files (dynamically loaded)
- **Utilities**: `src/lib/` — economy store, UI helpers, access control, formatting
- **Data**: `data/economy.json` — flat-file JSON database (auto-created)

## Environment Variables / Secrets

| Key | Required | Description |
|-----|----------|-------------|
| `DISCORD_TOKEN` | Yes | Bot token from Discord Developer Portal |
| `CLIENT_ID` | Yes | Application/Client ID from Discord Developer Portal |
| `GUILD_ID` | No | Test server ID for instant command registration |
| `ECONOMY_ADMIN_ROLE_ID` | No | Role ID that grants admin economy commands |
| `ECONOMY_DISTRIBUTION_CHANNEL_ID` | No | Channel ID for `/splitmoney` command |
| `PORT` | Auto | HTTP server port (set to 5000 for Replit) |

## Workflow

- **Start application**: `npm start` — runs `node src/index.js`, listens on port 5000

## Deployment

- Target: `vm` (always-running, needed for persistent bot connection)
- Run command: `node src/index.js`
