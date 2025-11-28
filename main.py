import discord
from discord.ext import commands
import os
import asyncio
import logging

logging.basicConfig(level=logging.INFO)

class MyBot(commands.Bot):
    def __init__(self):
        super().__init__(
            command_prefix="!",
            intents=discord.Intents.default(),
            help_command=None
        )

    async def setup_hook(self):
        # Load BOTH extensions
        initial_extensions = ["image_cog", "search_cog"]
        
        for extension in initial_extensions:
            try:
                await self.load_extension(extension)
                logging.info(f"✅ Loaded {extension}")
            except Exception as e:
                logging.error(f"❌ Failed to load {extension}: {e}")

        await self.tree.sync()
        logging.info("✅ Slash Commands Synced Globaly!")

    async def on_ready(self):
        logging.info(f"🚀 Logged in as {self.user} (ID: {self.user.id})")
        await self.change_presence(activity=discord.Activity(
            type=discord.ActivityType.watching, 
            name="/imagine & /search"
        ))

async def main():
    token = os.getenv("DISCORD_TOKEN")
    if not token:
        logging.error("❌ DISCORD_TOKEN is missing!")
        return

    bot = MyBot()
    async with bot:
        await bot.start(token)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
