require("dotenv").config();

const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const {
  Client,
  Collection,
  Events,
  GatewayIntentBits,
  REST,
  Routes
} = require("discord.js");
const { ICONS, COLORS, createEconomyEmbed, asReply } = require("./lib/ui");

function isIgnorableInteractionError(error) {
  return error?.code === 10062 || error?.code === 40060;
}

const requiredEnv = ["DISCORD_TOKEN", "CLIENT_ID"];
const missingEnv = requiredEnv.filter((name) => !process.env[name]);

if (missingEnv.length > 0) {
  console.error(
    `Eksik .env degiskenleri: ${missingEnv.join(", ")}. Lutfen .env dosyasini doldur.`
  );
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

client.commands = new Collection();

const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((fileName) => fileName.endsWith(".js"));

const commandPayloads = [];

for (const fileName of commandFiles) {
  const command = require(path.join(commandsPath, fileName));

  if (!command?.data || !command?.execute) {
    console.warn(`Gecersiz komut dosyasi atlandi: ${fileName}`);
    continue;
  }

  client.commands.set(command.data.name, command);
  commandPayloads.push(command.data.toJSON());
}

async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

  if (process.env.GUILD_ID) {
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commandPayloads }
    );
    console.log(`Komutlar test sunucusuna yuklendi (GUILD_ID: ${process.env.GUILD_ID}).`);
    return;
  }

  await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), {
    body: commandPayloads
  });
  console.log("Komutlar global olarak yuklendi (yayilmasi biraz surebilir).");
}

function startKeepAliveServer() {
  const port = Number(process.env.PORT || 3000);

  const server = http.createServer((req, res) => {
    if (req.url?.startsWith("/health")) {
      const payload = JSON.stringify({
        status: "ok",
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString()
      });

      res.writeHead(200, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store"
      });
      res.end(payload);
      return;
    }

    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Discord economy bot is running.");
  });

  server.listen(port, () => {
    console.log(`Keep-alive HTTP sunucusu acildi (PORT: ${port}).`);
  });

  server.on("error", (error) => {
    console.error("Keep-alive HTTP sunucusu hatasi:", error);
  });
}

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Bot hazir: ${readyClient.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) {
    return;
  }

  const command = client.commands.get(interaction.commandName);

  if (!command) {
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`Komut calisirken hata: ${interaction.commandName}`, error);

    const errorMessage = "Komut calisirken bir hata olustu.";
    const errorEmbed = createEconomyEmbed({
      interaction,
      title: `${ICONS.warn} Komut Hatasi`,
      description: errorMessage,
      color: COLORS.danger
    });
    const errorPayload = asReply(errorEmbed, true);

    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(errorPayload);
        return;
      }

      await interaction.reply(errorPayload);
    } catch (replyError) {
      if (isIgnorableInteractionError(replyError)) {
        console.warn(
          `Komut hata cevabi gonderilemedi (interaction state): ${interaction.commandName}`
        );
        return;
      }

      console.error("Komut hata cevabi gonderilirken beklenmeyen hata:", replyError);
    }
  }
});

(async () => {
  startKeepAliveServer();
  await registerCommands();
  await client.login(process.env.DISCORD_TOKEN);
})();
